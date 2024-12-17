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

// 在 HTTP 伺服器上建立 WebSocket 伺服器
const wss = new WebSocket.Server({ server });

let unitySocket = null; // 儲存 Unity 客戶端的連接

// WebSocket 連接事件
wss.on("connection", (ws) => {
    console.log("新客戶端已連接");

    // 接收消息
    ws.on("message", (message) => {
        console.log("收到消息:", message);

        if (message === "Unity") {
            // Unity 客戶端的識別消息
            console.log("Unity 客戶端已認證");
            unitySocket = ws; // 儲存 Unity 客戶端的連接
            ws.send("已成功連接到伺服器");
        } else if (unitySocket && ws !== unitySocket) {
            // 其他客戶端的消息轉發給 Unity
            unitySocket.send(message);
            console.log("消息已轉發到 Unity");
        } else {
            // 回應其他客戶端的消息
            ws.send(`伺服器回應: ${message}`);
        }
    });

    // 客戶端斷開連接處理
    ws.on("close", () => {
        if (ws === unitySocket) {
            console.log("Unity 客戶端已斷開");
            unitySocket = null; // 清除 Unity 客戶端連接
        } else {
            console.log("普通客戶端已斷開");
        }
    });
});

// 啟動伺服器
server.listen(PORT, () => {
    console.log(`伺服器正在執行，端口：${PORT}`);
    console.log(`靜態網頁可訪問：http://localhost:${PORT}`);
});
