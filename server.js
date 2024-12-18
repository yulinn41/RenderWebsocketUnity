const http = require("http");
const WebSocket = require("ws");
const express = require("express");
const path = require("path");

// 使用 Render 或 Heroku 指定的 PORT 或預設為 8080
const PORT = process.env.PORT || 8080;

// 創建 Express 應用
const app = express();

// 提供靜態檔案 (將 public 資料夾設為根目錄)
app.use(express.static(path.join(__dirname, "public")));

// 創建 HTTP 伺服器，並將 Express 設置為 handler
const server = http.createServer(app);

// 在 HTTP 伺服器上創建 WebSocket 伺服器
const wss = new WebSocket.Server({ server });

let unitySocket = null; // 儲存 Unity 客戶端的連接

wss.on("connection", (ws) => {
    console.log("新客戶端已連接");

    // 心跳檢查機制
    const interval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.ping(); // 發送心跳信號
        }
    }, 25000); // 每 25 秒發送一次心跳

    // 接收消息
    ws.on("message", (message) => {
        const msgString = message.toString(); // 確保消息轉為字符串
        const shortMsgString = message.substring(0, 20);
        console.log("收到消息:", shortMsgString);

        // 如果是圖片數據
        if (msgString.startsWith("data:image/png;base64,")) {
            console.log("收到圖片數據");

            if (unitySocket) {
                // 將圖片發送給 Unity 並等待回傳圖片數量
                unitySocket.send(msgString);
                console.log("圖片數據已發送到 Unity");

                // 假設 Unity 回傳的格式是 `ImageQueue:<數量>`
                unitySocket.once("message", (unityMessage) => {
                    if (unityMessage.toString().startsWith("ImageQueue:")) {
                        ws.send(unityMessage.toString()); // 只回傳給當前客戶端
                        console.log("圖片排隊數量已回傳給客戶端:", unityMessage.toString());
                    }
                });
            } else {
                ws.send("無法轉發圖片數據，Unity 未連接");
                console.log("Unity 未連接，無法轉發圖片數據");
            }
        } else if (msgString === "Unity") {
            // Unity 客戶端連接
            console.log("Unity 客戶端已認證");
            unitySocket = ws; // 保存 Unity 連接
            ws.send("Unity 已成功連接到伺服器");
        } else if (unitySocket && ws !== unitySocket) {
            // 普通消息轉發到 Unity
            unitySocket.send(msgString);
            console.log("消息已轉發到 Unity: ", msgString);
        } else if (msgString.startsWith("ImageQueue:")) {
            // 如果 Unity 傳來圖片數量，轉發給所有連接的網頁客戶端（保留這個功能可選）
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(msgString); // 廣播圖片數量
                }
            });
        } else {
            // 返回普通回應
            ws.send(`伺服器回應: ${msgString}`);
            console.log("已回應消息: ", `伺服器回應: ${msgString}`);
        }
    });

    // 客戶端斷開處理
    ws.on("close", () => {
        clearInterval(interval); // 清除心跳定時器
        if (ws === unitySocket) {
            console.log("Unity 客戶端已斷開");
            unitySocket = null; // 清除 Unity 連接
        } else {
            console.log("普通客戶端已斷開");
        }
    });

    // 錯誤處理
    ws.on("error", (err) => {
        console.error("WebSocket 錯誤:", err);
    });
});



// 啟動伺服器
server.listen(PORT, () => {
    console.log(`伺服器正在執行，端口：${PORT}`);
    console.log(`靜態網頁可訪問：http://localhost:${PORT}`);
});
