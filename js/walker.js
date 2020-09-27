/*** 設定 ***/
const
    // デフォルト緯度
    DEFAULT_LAT = 41.4035104,
    // デフォルト経度
    DEFAULT_LNG = 2.174569;

/*** 関数類 ***/
// パラメータ取得
function getParam(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return (undefined);
    if (!results[2]) return ("");
    return (decodeURIComponent(results[2].replace(/\+/g, " ")));
}

// 視点左右角度判定変更
function setHandle(instance, way) {
    if (!instance || !way) return;
    var nowPov = instance.getPov();
    if (way.toLowerCase() === "l") {        // 左
        setHeadingData = nowPov.heading - 45;
    } else if (way.toLowerCase() === "r") { // 右
        setHeadingData = nowPov.heading + 45;
    } else {
        return;
    }
    if (setHeadingData < 0) setHeadingData = 360 + setHeadingData;
    setHeadingData %= 360;
    instance.setPov({
        heading: setHeadingData,
        pitch: 10,
        zoom: 1,
    });
}

// 進行方向判定変更
function setGear(instance, way) {
    if (!instance || !way) return;
    var nowPov = instance.getPov(), posDiff, links = instance.getLinks(), setLink;
    if (way.toLowerCase() === "d") {        // 前
        // 視点左右角度が近いリンク先を判定
        posDiff = 360;
        links.forEach(function (temp, index, array) {
            if (DEBUG) console.log(nowPov.heading + ", " + temp.heading);
            if (Math.abs(nowPov.heading - temp.heading) <= posDiff) {
                posDiff = Math.abs(nowPov.heading - temp.heading);
                if (DEBUG) console.log(array[index]);
                setLink = array[index];
                if (DEBUG) console.log(index);
            }
        });
        links.forEach(function (temp, index, array) {
            if (temp.heading <= posDiff) {
                posDiff = temp.heading;
                setLink = array[index];
            }
        });
    } else if (way.toLowerCase() === "r") { // 後
        // 視点左右角度が遠いリンク先を判定
        posDiff = 0;
        links.forEach(function (temp, index, array) {
            if (DEBUG) console.log(nowPov.heading + ", " + temp.heading);
            if (Math.abs(nowPov.heading - temp.heading) >= posDiff) {
                posDiff = Math.abs(nowPov.heading - temp.heading);
                if (DEBUG) console.log(array[index]);
                setLink = array[index];
            }
        });
    } else {
        return;
    }
    instance.setPano(setLink.pano);
}

// 与えられた座標からパノラマのある座標を取得移動
var streetViewService = new google.maps.StreetViewService();
function setNearPano(instance, lat, lng) {
    streetViewService.getPanoramaByLocation({ lat: lat, lng: lng }, 50, function (response, status) {
        if (status === "OK") instance.setPosition(response.location.latLng);
    });
}

// 現在座標のGoogleマップリンクを生成してコピーとURLバー書き換え
function copyNowMapURL(instance) {
    if (!instance) return;
    var nowLatLng = instance.getLocation().latLng, url = location.protocol + "//" + location.host + location.pathname + "?lat=" + nowLatLng.lat() + "&lng=" + nowLatLng.lng();

    var tempArea = document.createElement("textarea");
    tempArea.textContent = url;
    var bodyElem = document.getElementsByTagName("body")[0];
    bodyElem.appendChild(tempArea);
    tempArea.select();
    document.execCommand("copy");
    bodyElem.removeChild(tempArea);

    window.history.replaceState("", "", url);
}

// ストリートビュー操作用インスタンス作成
var streetViewControl = new google.maps.StreetViewPanorama(document.getElementById("street-view"), {
    position: new google.maps.LatLng(DEFAULT_LAT, DEFAULT_LNG),
    disableDefaultUI: true,
    addressControl: true,
    clickToGo: false,
    scrollwheel: false,
    pov: {
        heading: 0,
        pitch: 10
    },
    addressControlOptions: {
        position: google.maps.ControlPosition.LEFT_BOTTOM,
    },
});

// パラメータに座標データがある場合
if (getParam("lat") && getParam("lng")) setNearPano(streetViewControl, Number(getParam("lat")), Number(getParam("lng")));