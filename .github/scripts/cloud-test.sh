#!/usr/bin/env bash
# 在模拟器里安装 APK、跑 .maestro/ 下的流程、收集截图和日志。
# 由 .github/workflows/cloud-test.yml 调用。
set -u
PKG=cn.toside.music.mobile
OUT=${OUT_DIR:-ci-out}
mkdir -p "$OUT/screens" "$OUT/maestro"

adb wait-for-device
adb shell settings put system screen_off_timeout 1800000
adb install -r -g "$APK_PATH" || exit 1
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
