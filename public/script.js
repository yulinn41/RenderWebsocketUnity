let ws;

// 記錄 Unity 是否已連接
let unityConnected = false;

// WebSocket 連接
function connectWebSocket() {
    ws = new WebSocket("wss://nantoulightfestival.onrender.com");

    ws.onopen = () => {
        console.log("已連接到伺服器");
    };

    ws.onclose = () => {
        console.log("伺服器連接已斷開");
        setTimeout(connectWebSocket, 1000); // 5 秒後嘗試重連
    };

    ws.onerror = (error) => {
        console.error("WebSocket 錯誤: ", error);
    };

    // 接收 WebSocket 回傳的消息
    ws.onmessage = (event) => {
        // 檢查是否是 Unity 狀態消息
        if (event.data.startsWith("UnityStatus:")) {
            const status = event.data.split(":")[1]; // 提取狀態值
            if (status === "Connected") {
                unityConnected = true;
                console.log("互動軟體已連接");
            } else if (status === "Disconnected") {
                unityConnected = false;
                console.log("互動軟體已斷開");
            }

        }
        else if (event.data.startsWith("ImageQueue:")) {
            const queueCount = event.data.split(":")[1];
            console.log("圖片排隊數量:", queueCount);

            // 更新 HTML 顯示圖片排隊數量
            document.getElementById("queue-status").innerText = `排隊圖片數量：${queueCount}`;
            // 顯示排隊數量的 alert
            alert(`圖片已上傳！當前排隊數量：${queueCount}`);
        } 
        else {
            console.log("其他消息:", event.data);
        }
    };

}

connectWebSocket();
// 點擊按鈕事件
const uploadButton = document.getElementById("upload");

// 點擊按鈕事件
uploadButton.addEventListener("click", () => {
    if (isCanvasBlank(canvas)) {
        alert("你還沒有畫圖，請先畫圖再上傳！");
        return; // 阻止繼續執行
    }

    if (ws.readyState !== WebSocket.OPEN) {
        alert("上傳失敗，請檢查伺服器連接！");
        return; // 阻止繼續執行
    }

    // 檢查 Unity 是否連接
    if (!unityConnected) {
        alert("上傳失敗，遊戲尚未連接！");
        return; // 阻止繼續執行
    }
    // 創建一個標準化的 canvas
    const resizedCanvas = document.createElement("canvas");
    const resizedCtx = resizedCanvas.getContext("2d");

    // 設定標準化尺寸
    const targetSize = 256; // 固定寬高
    resizedCanvas.width = targetSize;
    resizedCanvas.height = targetSize;

    // 填充白色背景
    resizedCtx.fillStyle = "#FFEEDE";
    resizedCtx.fillRect(0, 0, targetSize, targetSize);


    // 將原始畫布內容繪製到標準化 canvas
    resizedCtx.drawImage(canvas, 0, 0, targetSize, targetSize);

    // 獲取標準化 canvas 的圖片數據
    const imageData = resizedCanvas.toDataURL("image/png");
    ws.send(imageData); // 發送標準化圖片數據

    console.log("標準化圖片數據已發送:", imageData.substring(0, 20));
    isWaitingForQueue = true; // 等待伺服器回傳圖片數量

    ctx.clearRect(0, 0, canvas.width, canvas.height); // 清空原始畫布
});

// 工具函數：檢查 canvas 是否為空
function isCanvasBlank(canvas) {
    const blank = document.createElement("canvas"); // 建立一個空白的 canvas
    blank.width = canvas.width;
    blank.height = canvas.height;
    return canvas.toDataURL() === blank.toDataURL(); // 比較 dataURL，判斷是否為空
}




// 背景圖片切換
function resizeCanvasBackground() {
    const body = document.body;
    if (window.innerWidth <= 768) {
        body.style.backgroundImage = "url('pic/Small_1080x1920(low).webp')";
    } else if (window.innerWidth <= 1200) {
        body.style.backgroundImage = "url('pic/Middle_1200x1920(low).webp')";
    } else {
        body.style.backgroundImage = "url('pic/Big_1920x1080(low).webp')";
    }
    // 根据视口大小设置背景

}

resizeCanvasBackground();

// 確保 Canvas 和 Wrapper 尺寸同步
function resizeWrapper() {
    const wrapper = document.getElementById("canvas-wrapper");
    const canvas = document.getElementById("myCanvas");

    // 根據螢幕尺寸計算大小
    const size = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.9, 500);

    // 設置 Wrapper 的寬高
    wrapper.style.width = `${size}px`;
    wrapper.style.height = `${size}px`;

    // 確保 Canvas 的內部尺寸與 CSS 外觀一致
    canvas.width = size;
    canvas.height = size;

    //console.log(`Wrapper and Canvas resized to: ${size}px x ${size}px`);
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



// 定义一个函数来更新 --vh
function updateVh() {
    // 获取视口高度的 1%
    let vh = window.innerHeight * 0.01;
    // 设置为 CSS 自定义属性 --vh
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// 初始化时调用
updateVh();

// 在窗口调整大小时更新 --vh
window.addEventListener('resize', updateVh);
document.addEventListener('gesturestart', function (e) {
    e.preventDefault(); // 禁止双指缩放
});

document.addEventListener('touchmove', function (e) {
    if (e.scale !== 1) {
        e.preventDefault(); // 禁止触摸缩放
    }
}, { passive: false });
// 等待页面完全加载
window.onload = function () {
    // 获取 loading 层
    const loadingOverlay = document.getElementById('loading-overlay');

    // 设置 loading 层淡出
    loadingOverlay.style.opacity = 0;

    // 在过渡完成后移除元素
    setTimeout(() => {
        loadingOverlay.style.display = 'none';
    }, 500); // 等待过渡完成时间
};
// document.getElementById("test").addEventListener("click", () => {
//     const start = parseInt(document.getElementById("start").value);
//     const end = parseInt(document.getElementById("end").value);
//     //const count = parseInt(document.getElementById("count").value);
//     // 自动计算生成数量 (count)
//     const count = end - start + 1;

//     // 检查输入是否有效
//     if (isNaN(start) || isNaN(end) || isNaN(count) || start >= end || count <= 0) {
//         alert("請確保輸入範圍有效！");
//         return;
//     }

//     // 检查 WebSocket 是否已连接
//     if (ws.readyState !== WebSocket.OPEN) {
//         alert("上傳失敗，服務器可能尚未連接");
//         return; // 阻止继续执行
//     }

//     // 检查 Unity 是否已连接
//     if (!unityConnected) {
//         alert("上傳失敗，遊戲可能尚未連接！");
//         return; // 阻止继续执行
//     }

//     // 计算生成编号的步进值
//     const step = (end - start) / (count - 1);

//     for (let i = 0; i < count; i++) {
//         const number = Math.round(start + i * step); // 根据步进值计算当前编号
//         const color = `hsl(${(number * 36) % 360}, 100%, 50%)`;

//         // 创建一个 Canvas
//         const canvas = document.createElement("canvas");
//         canvas.width = 500;
//         canvas.height = 500;
//         const ctx = canvas.getContext("2d");

//         // 填充背景色
//         ctx.fillStyle = color;
//         ctx.fillRect(0, 0, canvas.width, canvas.height);

//         // 绘制编号
//         ctx.fillStyle = "white";
//         ctx.font = "bold 100px Arial";
//         ctx.textAlign = "center";
//         ctx.textBaseline = "middle";
//         ctx.fillText(number, canvas.width / 2, canvas.height / 2);

//         // 获取 Canvas 的图片数据
//         const imageData = canvas.toDataURL("image/png");
//         ws.send(imageData); // 发送图片数据
//     }

//     alert(`已成功生成并发送 ${count} 张图片！`);
// });
