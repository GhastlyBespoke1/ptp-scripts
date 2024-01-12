// ==UserScript==
// @name         PTP Upload MediaInfo
// @version      2.1
// @description  Drag & drop files to generate MediaInfo
// @author       fabulist
// @require      https://gist.github.com/po5/740d100c992f1315e81dbeca9a4b425a/raw/mediainfo.lib.js
// @match        https://passthepopcorn.me/upload.php*
// @icon         https://passthepopcorn.me/favicon.ico
// @run-at       document-end
// ==/UserScript==

// library version: mediainfo.js v0.1.7 (MediaInfo 21.09)
// all credits for the initial implementation to Eva - https://gist.github.com/po5/4a3f7d0b22871334c4e1bac68f0dde66


var mediaInfoTitleBlock = document.getElementById("source").parentElement.parentElement.parentElement.cloneNode(true);
mediaInfoTitleBlock.querySelector(".grid label").innerText = "MediaInfo:";
mediaInfoTitleBlock.querySelector(".form__input").innerHTML = "";
var mediaInfoBlock = document.createElement("div");
var mediaInfoFileInput = document.createElement("input");
mediaInfoFileInput.type = "file";
mediaInfoFileInput.id = "media_info_file_input";
var mediaInfoStatus = document.createElement("p");
mediaInfoStatus.id = "output";
mediaInfoStatus.innerText = "Select or drag & drop a file above";
mediaInfoBlock.appendChild(mediaInfoFileInput);
mediaInfoBlock.appendChild(mediaInfoStatus);
mediaInfoTitleBlock.querySelector(".form__input").appendChild(mediaInfoBlock);
const releaseDescriptionBlock = document.getElementById("release_desc_row");
releaseDescriptionBlock.parentNode.insertBefore(mediaInfoTitleBlock, releaseDescriptionBlock);


const fileinput = document.getElementById("media_info_file_input");
const output = document.getElementById("output");

const onChangeFile = (e) => {
    const file = e.target.files[0];
    if (file) {
        MediaInfo({ format: "text" }, (mediainfo) => {
            output.innerText = "Processing…";

            const getSize = () => file.size;

            const readChunk = (chunkSize, offset) =>
            new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = (event) => {
                    if (event.target.error) {
                        reject(event.target.error);
                    }
                    resolve(new Uint8Array(event.target.result))
                }
                reader.readAsArrayBuffer(file.slice(offset, offset + chunkSize))
            })

            mediainfo
                .analyzeData(getSize, readChunk)
                .then((result) => {
                document.getElementById('release_desc').value += "[mediainfo]\n" + result.replace(/^Format\s{7}(\s*)/m, 'Complete name$1: ' + file.name + '\nFormat       $1') + "[/mediainfo]\n";
                output.innerText = "Complete";
            })
                .catch((error) => {
                output.innerText = `An error occured:\n${error.stack}`
            })
        })
    }
}

fileinput.addEventListener("change", onChangeFile)
