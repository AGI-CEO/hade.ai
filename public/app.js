let userId = null;
let pdfName = null;
let pdfPath = null;
let pdfId = null;

const createPopupContainer = (content) => {
  const popupContainer = document.createElement("div");
  popupContainer.setAttribute("id", "popup-container");
  popupContainer.setAttribute("class", "popup-container");
  popupContainer.innerHTML = content;
  return popupContainer;
};

const formContent = `
    <div class="popup">
      <h2>Enter your email below 👇</h2>
      <p>Are you ready to learn?</p>
      <form id="email-form">
        <input type="email" id="email" name="email" placeholder="Your email address" required>
        <input type="submit" id="submit" value="Login">
      </form>
    </div>
  `;

setTimeout(() => {
  let popupContainer = createPopupContainer(formContent);
  document.body.prepend(popupContainer);
  popupContainer.classList.add("fade-in");

  document
    .getElementById("email-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      const email = document.getElementById("email").value;
      popupContainer.classList.remove("fade-in");
      popupContainer.classList.add("fade-out");

      // Disable scrolling on the body
      document.body.style.overflow = "hidden";

      setTimeout(() => {
        document.body.removeChild(popupContainer);
        fetch("/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        })
          .then(function (response) {
            return response.json();
          })
          .then(function (data) {
            userId = data.userId;
            setTimeout(() => {
              popupContainer = createPopupContainer(
                `<h2 style="font-weight:bold;">${data.message}</h2>`
              );
              document.body.prepend(popupContainer);
              popupContainer.classList.add("fade-in");
              setTimeout(() => {
                popupContainer.classList.remove("fade-in");
                popupContainer.classList.add("fade-out");
                setTimeout(() => {
                  document.body.removeChild(popupContainer);

                  // Re-enable scrolling on the body
                  document.body.style.overflow = "auto";
                }, 1000);
              }, 3000);
            }, 20);
          })
          .catch(function (error) {
            console.log(error);
          });
      }, 1000);
    });
}, 1000);

document.getElementById("pdf-upload").addEventListener("change", function () {
  const fileInput = document.getElementById("pdf-upload");
  const file = fileInput.files[0];
  if (file) {
    const formData = new FormData();
    formData.append("pdf", file);
    formData.append("userId", userId);

    fetch("/upload", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        const summary = data.summary;
        const pdfName = data.pdfName;
        const pdfPath = data.pdfPath;
        const pdfId = data.pdfId;

        // Add the summary as a bot message to the DOM
        const botMessage = document.createElement("div");
        botMessage.className = "bot-message";

        const avatar = document.createElement("div");
        avatar.className = "avatar";
        avatar.textContent = "🤖";

        const messageContainer = document.createElement("div");
        messageContainer.className = "message-container";

        const message = document.createElement("p");
        message.textContent = summary;

        messageContainer.appendChild(message);
        botMessage.appendChild(avatar);
        botMessage.appendChild(messageContainer);

        document.getElementById("chat-messages").appendChild(botMessage);
      })
      .catch((error) => console.error(error));
  }
});

document
  .getElementById("message-input")
  .addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }
  });

document.getElementById("send-button").addEventListener("click", function (e) {
  e.preventDefault();
  sendMessage();
});

function sendMessage() {
  const messageInput = document.getElementById("message-input");
  const messageText = messageInput.value;
  const uuid = userId;

  // Create a DOM element with the user message
  const userMessage = document.createElement("div");
  userMessage.id = uuid;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = "🧐";

  const messageContainer = document.createElement("div");
  messageContainer.className = "message-container";

  const message = document.createElement("p");
  message.textContent = messageText;

  messageContainer.appendChild(message);
  userMessage.appendChild(avatar);
  userMessage.appendChild(messageContainer);
  userMessage.className = "user-message";

  document.getElementById("chat-messages").appendChild(userMessage);
  // Scroll to the bottom of the chat
  const chatContainer = document.getElementById("chat-messages");
  chatContainer.scrollTop = chatContainer.scrollHeight;

  // Send a POST request to the /message route
  fetch("/message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uuid: userId,
      message: messageText,
      pdfName: pdfName,
      pdfPath: pdfPath,
      pdfId: pdfId,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log(data);

      // Create a DOM element with the bot message
      const botMessage = document.createElement("div");
      botMessage.className = "bot-message";

      const avatar = document.createElement("div");
      avatar.className = "avatar";
      avatar.textContent = "🤖";

      const messageContainer = document.createElement("div");
      messageContainer.className = "message-container";

      const message = document.createElement("p");
      message.textContent = data.response.message; // Use the response from the server

      messageContainer.appendChild(message);
      botMessage.appendChild(avatar);
      botMessage.appendChild(messageContainer);

      document.getElementById("chat-messages").appendChild(botMessage);
    })
    .catch((error) => console.error(error));

  // Clear the input field
  messageInput.value = "";
}
