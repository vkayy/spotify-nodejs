const track = document.querySelector('.carousel-track');
const cardEls = document.querySelectorAll(".carousel-card");
const previousBtnEl = document.querySelector(".carousel-prev-button");
const nextBtnEl = document.querySelector(".carousel-next-button");
const cardCount = informationData.songLimit;
const averageAudioFeatures = informationData.averageAudioFeatures;

console.log(averageAudioFeatures[0]);

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
