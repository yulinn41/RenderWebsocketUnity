const http = require("http");
const WebSocket = require("ws");

// 使用 Heroku 指定的 PORT 或默認為 8080
const PORT = process.env.PORT || 8080;

// 創建 HTTP 伺服器
const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("WebSocket server is running. Use a WebSocket client to connect.");
});

// 在 HTTP 伺服器上創建 WebSocket 伺服器
const wss = new WebSocket.Server({ server });

let unitySocket = null; // 儲存 Unity 客戶端的連接

wss.on("connection", (ws) => {
    console.log("新客戶端已連接");

    // 接收消息
    ws.on("message", (message) => {
        console.log("收到消息:", message);

        // 如果是 Unity 的識別消息
        if (message === "Unity") {
            console.log("Unity 客戶端已認證");
            unitySocket = ws; // 保存 Unity 連接
            ws.send("已成功連接到伺服器");
        } else if (unitySocket && ws !== unitySocket) {
            // 如果是來自普通客戶端，將消息轉發給 Unity
            unitySocket.send(message);
            console.log("消息已轉發到 Unity");
        } else {
            // 普通回應
            ws.send(`伺服器回應: ${message}`);
        }
    });

    // 客戶端斷開處理
    ws.on("close", () => {
        if (ws === unitySocket) {
            console.log("Unity 客戶端已斷開");
            unitySocket = null; // 清除 Unity 連接
        } else {
            console.log("普通客戶端已斷開");
        }
    });
});

// 啟動伺服器
server.listen(PORT, () => {
    console.log(`伺服器正在執行，端口：${PORT}`);
});