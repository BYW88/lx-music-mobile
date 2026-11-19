#!/usr/bin/env bash
# 在模拟器里安装 APK、跑 .maestro/ 下的流程、收集截图和日志。
# 由 .github/workflows/cloud-test.yml 调用。
set -u
PKG=cn.toside.music.mobile
OUT=${OUT_DIR:-ci-out}
mkdir -p "$OUT/screens" "$OUT/maestro"

adb wait-for-device
# 系统语言切到简体中文，截图和手机上看到的一致
adb root >/dev/null 2>&1 && sleep 3 && adb wait-for-device
adb shell "setprop persist.sys.locale zh-Hans-CN; setprop ctl.restart zygote" || true
sleep 5; adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = "1" ]; do sleep 2; done
sleep 5
adb shell settings put system screen_off_timeout 1800000
adb install -r -g "$APK_PATH" || exit 1
# 本地音乐测试用的几首歌，放到默认下载保存位置
if command -v ffmpeg >/dev/null; then
  SONGS=$(mktemp -d)
  mk() { ffmpeg -loglevel error -y -f lavfi -i "sine=frequency=$1:duration=20" "${@:3}" "$SONGS/$2"; }
  mk 440 "晴天 - 周杰伦.flac" -metadata title=晴天 -metadata artist=周杰伦 -metadata album=叶惠美
  mk 523 "后来 - 刘若英.mp3" -b:a 320k -metadata title=后来 -metadata artist=刘若英 -metadata album=我等你
  mk 587 "夜曲 - 周杰伦.mp3" -b:a 128k -metadata title=夜曲 -metadata artist=周杰伦 -metadata album=十一月的萧邦
  mk 659 "some_song_without_tags.mp3" -b:a 192k -map_metadata -1
  adb shell mkdir -p /sdcard/Music/lx-music
  adb push "$SONGS/." /sdcard/Music/lx-music/ >/dev/null
  adb shell ls -l /sdcard/Music/lx-music
fi
adb shell appops set "$PKG" MANAGE_EXTERNAL_STORAGE allow || true
adb logcat -c

# 冒烟：启动 App，等 15 秒，截图
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null
sleep 15
adb exec-out screencap -p > "$OUT/screens/00-launch.png"

STATUS=0
if ls .maestro/*.yaml >/dev/null 2>&1; then
  # takeScreenshot 的图片写到当前目录，所以在 maestro 输出目录里跑
  ( cd "$OUT/screens" && maestro test --format junit --output "../maestro/report.xml" \
      --test-output-dir "../maestro" "$GITHUB_WORKSPACE/.maestro" ) || STATUS=$?
fi

adb exec-out screencap -p > "$OUT/screens/99-final.png"
adb logcat -d > "$OUT/logcat.txt"
grep -E "FATAL EXCEPTION|ReactNativeJS.*(Error|Exception)" "$OUT/logcat.txt" > "$OUT/errors.txt" || true
if [ -s "$OUT/errors.txt" ]; then echo "::warning::logcat 里有错误，见 errors.txt"; fi
exit $STATUS
