/*** 設定 ***/
const
    // 視線確認時間 (秒)
    DURATION = 3,
    // サンプリング間隔 (回)
    CHECK_INTERVAL = 6,
    // メッセージ表示 (秒)
    MSG_DISPLAY_TIME = 1.5,
    // フェード時間 (秒)
    FADE_TIME = 0.2,
    ELEM_NAME = ["tl", "tc", "tr", "l", "cc", "r", "bc"],
    DEBUG = false;

/*** WebGazer起動 ***/
let data;
webgazer.setGazeListener(function (getData, elapsedTime) {
    if (getData == null) return;
    data = getData;
}).begin();

/*** 関数類 ***/
// ページロード時処理
function init() {
}

// 要素キーから変換
function toReadable(elemKey) {
    switch (elemKey) {
        case "tl":
            return ("カメラ");
        case "tc":
            return ("オーバレイ表示");
        case "tr":
            return ("お気に入り");
        case "l":
            return ("左移動");
        case "cc":
            return ("前進");
        case "r":
            return ("右移動");
        case "bc":
            return ("後退");
        case undefined:
            return;
        default:
            return;
    }
}

// 動作可能解像度時処理
function canOperate() {
    if (typeof controllerControl === "undefined") {
        currentState = true;
        webgazer.resume();
        webgazer.startVideo();
        startController();
    }
}

// 動作不能解像度時処理
function cannotOperate() {
    if (typeof controllerControl !== "undefined") {
        currentState = false;
        stopController();
        webgazer.pause();
        webgazer.stopVideo();
        $("#overlay-msg").text("【警告】動作不能解像度です");
        $("#overlay-float").fadeIn(FADE_TIME * 1000);
        $("#overlay-float").delay(MSG_DISPLAY_TIME * 1000).fadeOut(FADE_TIME * 1000, function () {
            $("#overlay-msg").text("");
        });
    }
}

// オーバーレイ表示
function showOverlay(time) {
    $(".overlay").animate({ opacity: 0.3 }, time * 1000);
}

// オーバーレイ非表示
function hideOverlay(time) {
    $(".overlay").animate({ opacity: 0 }, time * 1000);
}

// コントローラ起動
let controllerControl;
function startController() {
    let isHidOverlay = false, where = pastWhere = undefined, historyData = Array(CHECK_INTERVAL);
    controllerControl = setInterval(function () {
        if (webgazer.isReady() && $("#webgazerFaceOverlay").length && $("#webgazerFaceFeedbackBox").length && !isOperable) cannotOperate();
        if (webgazer.isReady() && $("#webgazerFaceOverlay").length && $("#webgazerFaceFeedbackBox").length && !isHidOverlay) {
            hideOverlay(MSG_DISPLAY_TIME);
            isHidOverlay = true;
        }
        if (webgazer.isReady() && data) {
            if (DEBUG) console.log("[視線推定座標]" + data.x + ", " + data.y + "\n[ウィンドウサイズ]" + document.documentElement.clientWidth + ", " + document.documentElement.clientHeight);
            // x横 y縦
            // 視線座標判定
            if ((0 <= data.x && data.x <= 320) &&
                (0 <= data.y && data.y <= 240)) where = "tl";
            else if ((320 < data.x && data.x <= document.documentElement.clientWidth - 320) &&
                (0 <= data.y && data.y <= 240)) where = "tc";
            else if ((document.documentElement.clientWidth - 320 < data.x && data.x <= document.documentElement.clientWidth) &&
                (0 <= data.y && data.y <= 240)) where = "tr";

            else if ((0 <= data.x && data.x <= document.documentElement.clientWidth * 0.2) &&
                (240 < data.y && data.y <= document.documentElement.clientHeight)) where = "l";

            else if ((document.documentElement.clientWidth * 0.2 < data.x && data.x <= document.documentElement.clientWidth * 0.8) &&
                (240 < data.y && data.y <= document.documentElement.clientHeight - 240)) where = "cc";

            else if ((document.documentElement.clientWidth * 0.8 < data.x && data.x <= document.documentElement.clientWidth) &&
                (240 < data.y && data.y <= document.documentElement.clientHeight)) where = "r";

            else if ((document.documentElement.clientWidth * 0.2 < data.x && data.x <= document.documentElement.clientWidth * 0.8) &&
                (document.documentElement.clientHeight - 240 < data.y && data.y <= document.documentElement.clientHeight)) where = "bc";
            else where = undefined;

            // 配列に視線座標判定をトレース
            for (var i = CHECK_INTERVAL; i > 0; i--) historyData[i] = historyData[i - 1];
            historyData[0] = where;

            console.log(historyData);

            // 視線位置がオーバーレイ表示だった場合
            if (historyData[0] === "tc") showOverlay(FADE_TIME);
            else hideOverlay(FADE_TIME);

            // 操作確定判定
            var match_cnt = 0, act_flg = false;

            for (var i = CHECK_INTERVAL; i > 0; i--) {
                if (historyData[i] === historyData[i - 1]) match_cnt++;
                else match_cnt = 0;
            }
            if (match_cnt === 0 && typeof pastWhere !== "undefined") {
                $("#overlay-float").fadeOut(FADE_TIME * 1000, function () {
                    $("#overlay-msg").text("");
                });
                if (match_cnt === 0) pastWhere = undefined;
            }
            if (match_cnt !== 0 && (typeof toReadable(historyData[0]) !== "undefined" && historyData[0] !== "tl" && historyData[0] !== "tc")) {
                $("#overlay-msg").text(toReadable(historyData[0]) + " 操作確定まで" + (CHECK_INTERVAL - (match_cnt - 1)) / (CHECK_INTERVAL / DURATION) + "秒");
                if ($("#overlay-float").is(":hidden")) $("#overlay-float").fadeIn(FADE_TIME * 1000);
                pastWhere = historyData[0];
            }
            if (match_cnt === CHECK_INTERVAL) act_flg = true;

            if (act_flg) {
                if (typeof toReadable(historyData[0]) !== "undefined" && historyData[0] !== "tl" && historyData[0] !== "tc") console.log(toReadable(historyData[0]));
                historyData = Array(CHECK_INTERVAL);
            }
        }
    }, (DURATION / CHECK_INTERVAL) * 1000);
}

// コントローラ停止
function stopController() {
    $("#overlay-float").fadeOut(FADE_TIME * 1000), function () {
        $("#overlay-msg").text("");
    };
    clearInterval(controllerControl);
    controllerControl = undefined;
}

/*** DOM読み込み時処理 ***/
$(function () {
    init();
});

/*** ウィンドウリサイズ時処理 ***/
let isOperable = currentState = (document.documentElement.clientWidth >= 640 && document.documentElement.clientHeight >= 720) ? true : false;
$(window).resize(function () {
    if (webgazer.isReady()) {
        // 動作可能最低解像度: 640×720
        isOperable = (document.documentElement.clientWidth >= 640 && document.documentElement.clientHeight >= 720) ? true : false;
        if (isOperable && !currentState) {
            // 動作可能
            canOperate();
        } else if (!isOperable && currentState) {
            // 動作不能
            cannotOperate();
        } else {
            if (DEBUG) console.log("[ウィンドウリサイズ] 無視");
        }
    }
});

/*** コントローラ開始 ***/
startController();