let ws;

// WebSocket 連接
function connectWebSocket() {
    ws = new WebSocket("wss://renderwebsocketunity.onrender.com");

    ws.onopen = () => {
        console.log("已連接到伺服器");
    };

    ws.onclose = () => {
        console.log("伺服器連接已斷開");
        setTimeout(connectWebSocket, 5000); // 5 秒後嘗試重連
    };

    ws.onerror = (error) => {
        console.error("WebSocket 錯誤: ", error);
    };

    // 接收 WebSocket 回傳的消息
    const queueStatus = document.getElementById("queue-status");

    ws.onmessage = (event) => {
        console.log("接收到伺服器消息:", event.data);

        if (isWaitingForQueue && event.data.startsWith("ImageQueue:")) {
            const queueCount = event.data.split(":")[1];
            console.log("圖片排隊數量:", queueCount);
            queueStatus.innerText = `排隊圖片數量：${queueCount}`;
            isWaitingForQueue = false; // 重置等待旗標
        } else {
            console.log("收到其他消息:", event.data);
        }
    };

}

// 初始化 WebSocket 連接
connectWebSocket();


// 背景圖片切換
function resizeCanvasBackground() {
    const body = document.body;
    if (window.innerWidth <= 768) {
        body.style.backgroundImage = "url('pic/Small_1080x1920 (2).webp')";
    } else if (window.innerWidth <= 1200) {
        body.style.backgroundImage = "url('pic/Middle_1200x1920 (2).webp')";
    } else {
        body.style.backgroundImage = "url('pic/Big_1920x1080 (2).webp')";
    }
}

resizeCanvasBackground();

// 確保 Canvas 和 Wrapper 尺寸同步
function resizeWrapper() {
    const wrapper = document.getElementById("canvas-wrapper");
    const canvas = document.getElementById("myCanvas");

    // 根據螢幕尺寸計算大小
    const size = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.8, 600);

    // 設置 Wrapper 的寬高
    wrapper.style.width = `${size}px`;
    wrapper.style.height = `${size}px`;

    // 確保 Canvas 的內部尺寸與 CSS 外觀一致
    canvas.width = size;
    canvas.height = size;

    console.log(`Wrapper and Canvas resized to: ${size}px x ${size}px`);
}
resizeWrapper();
window.addEventListener("resize", () => {
    resizeCanvasBackground();
    resizeWrapper();
});

// 初始化變量
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");
const buttons = document.querySelectorAll(".color-button");
let currentColor = "#000000";
let isDrawing = false;
let lastX = 0, lastY = 0;

// 綁定顏色選擇
buttons.forEach(button => {
    button.addEventListener("click", () => {
        buttons.forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
        currentColor = button.getAttribute("data-color");
    });
});

// 工具函數：獲取正確的座標
function getCoordinates(event) {
    const rect = canvas.getBoundingClientRect(); // 取得 Canvas 邊界
    const scaleX = canvas.width / rect.width; // X 軸縮放比例
    const scaleY = canvas.height / rect.height; // Y 軸縮放比例

    let x, y;
    if (event.touches) {
        x = (event.touches[0].clientX - rect.left) * scaleX;
        y = (event.touches[0].clientY - rect.top) * scaleY;
    } else {
        x = (event.clientX - rect.left) * scaleX;
        y = (event.clientY - rect.top) * scaleY;
    }

    return { x, y };
}

// 繪圖事件處理
function startDrawing(event) {
    isDrawing = true;
    const { x, y } = getCoordinates(event);
    lastX = x;
    lastY = y;
}

function draw(event) {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(event);

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentColor === "#000000" ? 25 : 20; // 橡皮擦寬度稍大
    ctx.lineCap = "round";
    ctx.stroke();

    lastX = x;
    lastY = y;
}

function stopDrawing() {
    isDrawing = false;
}

// 綁定事件
canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mouseout", stopDrawing);

// 手機觸控事件
canvas.addEventListener("touchstart", startDrawing, { passive: false });
canvas.addEventListener("touchmove", draw, { passive: false });
canvas.addEventListener("touchend", stopDrawing);

// 清除功能
const clearButton = document.getElementById("clear-canvas");
clearButton.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});
let isWaitingForQueue = false; // 確保是否在等待伺服器回應的狀態

const uploadButton = document.getElementById("upload");

// 點擊按鈕事件
// 點擊按鈕事件
uploadButton.addEventListener("click", () => {
    if (isCanvasBlank(canvas)) {
        alert("你還沒有畫圖，請先畫圖再上傳！");
        return; // 阻止繼續執行
    }

    if (ws.readyState === WebSocket.OPEN) {
        const imageData = canvas.toDataURL("image/png");
        ws.send(imageData); // 發送圖片數據
        console.log("圖片數據已發送:", imageData.substring(0, 20));
        isWaitingForQueue = true; // 等待伺服器回傳圖片數量
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
        alert("上傳失敗，請檢查伺服器連接！");
    }
});

// 工具函數：檢查 canvas 是否為空
function isCanvasBlank(canvas) {
    const blank = document.createElement("canvas"); // 建立一個空白的 canvas
    blank.width = canvas.width;
    blank.height = canvas.height;
    return canvas.toDataURL() === blank.toDataURL(); // 比較 dataURL，判斷是否為空
}
