const createPopupContainer = () => {
  const popupContainer = document.createElement("div");
  popupContainer.setAttribute("id", "popup-container");
  popupContainer.setAttribute("class", "popup-container fade-in");
  popupContainer.innerHTML = `
      <div class="popup">
        <h2>Enter your email below 👇</h2>
        <p>Are you ready to learn?</p>
        <form id="email-form">
          <input type="email" id="email" name="email" placeholder="Your email address" required>
          <input type="submit" id="submit" value="Login">
        </form>
      </div>
    `;
  return popupContainer;
};

setTimeout(() => {
  const popupContainer = createPopupContainer();
  document.body.prepend(popupContainer);

  setTimeout(() => {
    popupContainer.classList.add("show");
    document
      .getElementById("email-form")
      .addEventListener("submit", function (e) {
        e.preventDefault();
        const email = document.getElementById("email").value;
        popupContainer.classList.remove("fade-in");
        popupContainer.classList.add("fade-out");
        setTimeout(() => {
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
                popupContainer.innerHTML = `<h2 style="font-weight:bold;">${data.message}</h2>`;
                popupContainer.classList.remove("fade-out");
                popupContainer.classList.add("fade-in");
                setTimeout(() => {
                  popupContainer.classList.add("fade-out");
                  setTimeout(() => {
                    document.body.removeChild(popupContainer);
                  }, 1000);
                }, 3000);
              }, 1000);
            })
            .catch(function (error) {
              console.log(error);
            });
        }, 1000);
      });
  }, 20);
}, 1000);
