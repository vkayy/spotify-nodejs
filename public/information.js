const track = document.querySelector('.carousel-track');
const cardEls = document.querySelectorAll(".carousel-card");
const previousBtnEl = document.querySelector(".carousel-prev-button");
const nextBtnEl = document.querySelector(".carousel-next-button");
const cardCount = informationData.songLimit;

let cardIndex = 0;

function showCard(index) {
    cardEls.forEach((card) => {
        card.style.display = "none";
        card.classList.remove("swing-in-bottom-bck-general");
    });

    cardEls[index].style.display = "flex";
    cardEls[index].classList.add("swing-in-bottom-bck-general");
}

function nextSlide() {
    cardIndex = (cardIndex + 1) % cardEls.length;
    showCard(cardIndex);
}

function previousSlide() {
    cardIndex = (cardIndex - 1 + cardEls.length) % cardEls.length
    showCard(cardIndex);
}

showCard(cardIndex);

previousBtnEl.addEventListener("click", previousSlide);
nextBtnEl.addEventListener("click", nextSlide);

let sliderContainerEl = document.querySelector(".slider-container");
let statsSliderEl = document.querySelector(".stats-slider");

let pressed = false;
let startX;
let x;

sliderContainerEl.addEventListener("mousedown", (e) => {
    pressed = true;
    startX = e.offsetX - statsSliderEl.offsetLeft;
    sliderContainerEl.style.cursor = "grabbing";
});

sliderContainerEl.addEventListener("mouseenter", () => {
    sliderContainerEl.style.cursor = "grab";
});

sliderContainerEl.addEventListener("mouseup", () => {
    sliderContainerEl.style.cursor = "grab";
    pressed = false;
});

sliderContainerEl.addEventListener("mousemove", (e) => {
    if (!pressed) return;
    e.preventDefault();
    x = e.offsetX;

    statsSliderEl.style.left = `${x - startX}px`
    checkBoundary();
})

const checkBoundary = () => {
    let outer = sliderContainerEl.getBoundingClientRect();
    let inner = statsSliderEl.getBoundingClientRect();

    if (parseInt(statsSliderEl.style.left) > 0) {
        statsSliderEl.style.left = "0px";
    }

    if (inner.right < outer.right) {
        statsSliderEl.style.left = `-${inner.width - outer.width}px`
    }
};