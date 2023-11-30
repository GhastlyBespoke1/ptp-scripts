// ==UserScript==
// @name         PTP - Forum BP Sender
// @version      1.3
// @description  A Userscript which allows you to send BP to users via forums
// @author       coollachlan8
// @match        https://passthepopcorn.me/forums.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=passthepopcorn.me
// @grant        none
// ==/UserScript==

const ForContest = false;

const Multiplier = 50000;

const MinAmount = 0;

const SendDescription = "Pancakes!";

(function() {
    'use strict';
    async function retrieveData(ptpId) {
        return await retrieveFromDatabase("ptpForumPayments", ptpId);
    }

    async function retrieveFromDatabase(dbName, id) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 1);

            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction('ForumIdList', 'readonly');
                const objectStore = transaction.objectStore('ForumIdList');
                const getRequest = objectStore.get(id);

                getRequest.onsuccess = (event) => {
                    const movie = event.target.result;
                    if (movie) {
                        console.debug(`[${dbName}] Data found:`, movie);
                        resolve(movie);
                    } else {
                        console.debug(`[${dbName}] Data not found for ID:`, id);
                        resolve(null);
                    }
                };
                getRequest.onerror = (event) => {
                    console.error(`[${dbName}] Error retrieving data (request):`, event.target.error);
                    reject(event.target.error);
                };
                transaction.oncomplete = () => { db.close(); };
                transaction.onerror = (event) => {
                    console.error(`[${dbName}] Error retrieving data (transaction):`, event.target.error);
                    reject(event.target.error);
                };
            };
            request.onerror = (event) => {
                console.error(`Error opening ${dbName} database:`, event.target.error);
                reject(event.target.error);
            };
        });
    }

    async function removeValue(id) {
     return await removeFromDatabase("ptpForumPayments", id)
    }

    async function removeFromDatabase(dbName, movie) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 1);

            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction('ForumIdList', 'readwrite');
                const objectStore = transaction.objectStore('ForumIdList');

                const putRequest = objectStore.delete(movie);

                putRequest.onsuccess = () => {
                    console.debug(`[${dbName}] Data Deleted successfully.`, movie);
                    resolve();
                };
                putRequest.onerror = (event) => {
                    console.error(`[${dbName}] Error Deleting data (request):`, event.target.error);
                    reject(event.target.error);
                };
                transaction.oncomplete = () => { db.close(); };
                transaction.onerror = (event) => {
                    console.error(`[${dbName}] Error ree data (transaction):`, event.target.error);
                    reject(event.target.error);
                };
            };
            request.onerror = (event) => {
                console.error(`Error opening ${dbName} database:`, event.target.error);
                reject(event.target.error);
            };
        });
    }

    async function storeData(id, data) {
        return await storeInDatabase("ptpForumPayments", id, data);
    }


    async function storeInDatabase(dbName, movie, data) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 1);

            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction('ForumIdList', 'readwrite');
                const objectStore = transaction.objectStore('ForumIdList');

                const putRequest = objectStore.put({"ptpForumId": movie, value: data});

                putRequest.onsuccess = () => {
                    console.debug(`[${dbName}] Data stored successfully.`, movie);
                    resolve();
                };
                putRequest.onerror = (event) => {
                    console.error(`[${dbName}] Error storing data (request):`, event.target.error);
                    reject(event.target.error);
                };
                transaction.oncomplete = () => { db.close(); };
                transaction.onerror = (event) => {
                    console.error(`[${dbName}] Error storing data (transaction):`, event.target.error);
                    reject(event.target.error);
                };
            };
            request.onerror = (event) => {
                console.error(`Error opening ${dbName} database:`, event.target.error);
                reject(event.target.error);
            };
        });
    }


    function initializeDatabase() {
        const dbName = "ptpForumPayments";
        const dbId = "ptpForumId";

        const request = indexedDB.open(dbName, 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            db.createObjectStore('ForumIdList', { keyPath: dbId });
            console.info(`[${dbName}] Database created.`);
        };
    }

    async function CreateElements(currentElement) {
        let div = document.createElement("div");
        div.style.cssText = "display:flex;flex-direction:column;width:95%;align-content:center;margin:auto;background-color:#191919;border-radius:15px;margin-top:15px;"

        let form = document.createElement('form');
        form.id = "sendPoints";
        form.style.cssText = "display:inline-flex;flex-direction:row;margin-top:10px;flex-wrap:wrap;justify-content:space-evenly;width:100%;";
        let userData = currentElement.querySelector(".username");
        let DonationUrl = userData.href;
        let input1;
        let input2;

        let input3 = document.createElement('input');
        input3.style.cssText = "width:90%;margin-top:5px;"
        input3.name = "calculation"
        input3.required = true;

        let DescriptionBox = document.createElement("textarea")
        DescriptionBox.className = "form__input"
        DescriptionBox.name = "message"
        DescriptionBox.placeholder = "Message (optional)"
        DescriptionBox.rows = "3"
        DescriptionBox.style.cssText = "width:90%;margin-top:10px;"

        if(ForContest) {
            input1 = document.createElement('input');
            input1.value = Multiplier
            input1.style.cssText = "width:55%;";
            input1.name = "multiplier"
            input1.required = true;

            input2 = document.createElement('input');
            input2.style.cssText = "width:30%;";
            input2.name = "amount";
            input2.required = true;

            form.appendChild(input1);
            form.appendChild(input2);

            input2.addEventListener("change", (event) => {
                input3.value = input1.value * input2.value;
            });
        }

        if(MinAmount >= 1 && ForContest) {
            input2.value = MinAmount;
            input3.value = input1.value * input2.value;
        }

        let submit = document.createElement('input');
        submit.type = "submit";
        submit.style.cssText = "width:90%;margin-top:10px;margin-bottom:10px;";
        let checkDb = await retrieveData(currentElement.id)

        if(checkDb == null) {
            submit.value = "Send BP!";
        } else {
           submit.value = "Send BP! ⚠️";
        }

        form.appendChild(input3);

        if(!ForContest) {
            form.appendChild(DescriptionBox);
        }
        form.appendChild(submit);

        div.appendChild(form);

        let imageElement = currentElement.querySelector(".forum-post__avatar");

        imageElement.appendChild(div);

        let c = /post([0-9]{0,})/.exec(currentElement.id);

        let forumSpanHeader = currentElement.querySelector(`#bar${c[1]}`);

        let RemoveItem = document.createElement("a")
        RemoveItem.textContent = "[Remove From DB]"

        let AddToPostButton = document.createElement("a")
        AddToPostButton.textContent = "[Add To Post]"
        AddToPostButton.style.cssText = "margin-right:3px;"


        forumSpanHeader.prepend(RemoveItem);
        forumSpanHeader.prepend(AddToPostButton);

        RemoveItem.addEventListener("click", async (e) => {
            await removeValue(currentElement.id);
            submit.value = "Send BP!";
            alert("removed from db");
        });

        AddToPostButton.addEventListener("click", () => AddToPost(currentElement.id));

        form.addEventListener("submit", async (e) => HandleFormPost(e, currentElement.id, DonationUrl, e.target.calculation.value, userData));
    }

    async function HandleFormPost(e, PostId, Url, Calculation, userData) {
        e.preventDefault();
        let checkDb = await retrieveData(PostId)
        if(checkDb != null) {
            alert("You have already paid this post!")
        } else {
            const message = (e.target.message.value !== "") || (!ForContest) ? e.target.message.value : SendDescription;
            const antiCSRF = document.body.getAttribute('data-anticsrftoken');
            var xhr = new XMLHttpRequest();
            xhr.open("POST", "/bonus.php", true);
            xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            xhr.send("AntiCsrfToken="+antiCSRF+"&action=send&target=" + Url + "&amount=" + Calculation + "&message=" + message);
            xhr.onreadystatechange=function(){
                if (xhr.readyState==4 && xhr.status==200){
                    let domParser = new window.DOMParser();
                    let doc = domParser.parseFromString(xhr.responseText, "text/html");
                    let response = doc.querySelector(".alert");

                    if(response.textContent.startsWith("You have sent")) {
                        let username = userData.textContent;
                        storeData(PostId, {amount: Calculation, username: username})

                        UpdateQuickPost("[quote] You have sent " + Calculation  +" points to " + username + " [/quote]\r\n\r\n");

                        alert("You have sent " + Calculation  +" points to " + username)
                    } else {
                        alert("Failed to send BP:\n" + response.textContent)
                    }
                }
            }
        }
    }

    async function UpdateQuickPost(message) {
        let postSection = document.getElementById("quickpost")

        postSection.value += message;
    }

    async function AddToPost(PostId) {
        let checkDb = await retrieveData(PostId)
        if(checkDb != null) {
            if(checkDb.value) {
                UpdateQuickPost("[quote] You have sent " + checkDb.value.amount  +" points to " + checkDb.value.username + " [/quote]\r\n\r\n");

                alert("You have sent " + checkDb.value.amount  +" points to " + checkDb.value.username);
            } else {
                //should never be here
            }
        } else {
            alert("You have not paid this post!");
        }
    }

    async function main() {
        let Posts = document.querySelectorAll(".forum_post");

        for(let i = 0; i < Posts.length; i++) {
            CreateElements(Posts[i]);
        }
    }

    initializeDatabase();
    main();
})();
