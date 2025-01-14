const http = require("http");
const WebSocket = require("ws");
const express = require("express");
const path = require("path");

// 使用 Render 或 Heroku 指定的 PORT 或預設為 8080
const PORT = process.env.PORT || 8081;

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


    // 當新的網頁客戶端連接時，發送 Unity 的當前連接狀態
    if (unitySocket && unitySocket.readyState === WebSocket.OPEN) {
        ws.send("InteractiveConnected");
    }
    ws.on("message", (message) => {
        const msgString = message.toString();

        // 獲取短消息（處理長度小於 20 的情況）
        const shortMsgString = msgString.length > 20 ? msgString.substring(0, 20) : msgString;
        console.log("收到消息:", shortMsgString);


        // Unity 客戶端連接
        if (msgString === "Unity") {
            console.log("Unity 客戶端已認證");
            unitySocket = ws; // 保存 Unity 連接
            broadcastToClients("InteractiveConnected"); // 廣播 Unity 已連接
        }
        // 圖片數據處理
        else if (msgString.startsWith("data:image/png;base64,")) {
            console.log("收到圖片數據");

            if (unitySocket && unitySocket.readyState === WebSocket.OPEN) {
                unitySocket.send(msgString); // 將圖片數據發送到 Unity
                console.log("圖片數據已發送到 Unity");

                const timeout = setTimeout(() => {
                    console.error("Unity 未回應，超時中止回呼");
                    ws.send("Unity 未回應，請稍後重試");
                }, 5000); // 設置超時（例如 5 秒）

                unitySocket.once("message", (unityMessage) => {
                    clearTimeout(timeout); // 清除超時
                    if (unityMessage.toString().startsWith("ImageQueue:")) {
                        ws.send(unityMessage.toString()); // 回傳給當前客戶端
                        console.log("圖片排隊數量已回傳給客戶端:", unityMessage.toString());
                        /*broadcastToClients(unityMessage.toString()); // 廣播給所有客戶端*/
                    }
                });

            } else {
                ws.send("無法轉發圖片數據，Unity 未連接");
                console.log("Unity 未連接，無法轉發圖片數據");
            }
        }


        // 處理其他消息
        else {
            ws.send(`伺服器回應: ${msgString}`);
            console.log("已回應消息: ", `伺服器回應: ${msgString}`);
        }
    });

    // 客戶端斷開處理
    ws.on("close", () => {
        clearInterval(interval); // 清除心跳定時器

        if (ws === unitySocket) {
            console.log("Unity 客戶端已斷開");
            unitySocket = null;

            // 廣播 Unity 已斷開狀態
            broadcastToClients("UnityDisconnected");
        } else {
            console.log("普通客戶端已斷開");
        }
    });

    // 錯誤處理
    ws.on("error", (err) => {
        console.error("WebSocket 錯誤:", err);
    });
});




// 廣播消息給所有客戶端
function broadcastToClients(message) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// 啟動伺服器
server.listen(PORT, () => {
    console.log(`伺服器正在執行，端口：${PORT}`);
    console.log(`靜態網頁可訪問：http://localhost:${PORT}`);
});
