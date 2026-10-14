#!/bin/sh
# Moodle 4.5 の公式言語パック（ja / zh_cn / ko / es）と、Moodle 本体の英語の言語ファイルを取得する
# 取得物（packs/ zips/ moodle-src/）はコミットしない
set -eu
cd "$(dirname "$0")"
mkdir -p zips packs
for l in ja zh_cn ko es; do
  curl -sSL -o "zips/$l.zip" "https://download.moodle.org/download.php/direct/langpack/4.5/$l.zip"
  unzip -q -o "zips/$l.zip" -d packs
done
if [ ! -d moodle-src ]; then
  git clone -q --depth 1 --branch MOODLE_405_STABLE --filter=blob:none --no-checkout https://github.com/moodle/moodle.git moodle-src
  (cd moodle-src && git sparse-checkout set --no-cone '/lang/en/*.php' '**/lang/en/*.php' && git checkout -q MOODLE_405_STABLE)
fi
