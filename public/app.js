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
