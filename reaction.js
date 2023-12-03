const AgreeButton = document.getElementById("AgreeButton");
const AgreePage = document.getElementById("agree");
const PlayButton = document.getElementById("PlayButton");
const RulePage = document.getElementById("rule");
const StartoverlayPage = document.getElementById("StartOverlay");

if (document.cookie.includes("Agree")) {
    AgreePage.style.display = "none";
    RulePage.style.display = "block";
}
console.log(document.cookie)
AgreeButton.addEventListener("click", () => {
    AgreePage.style.display = "none";
    RulePage.style.display = "block";
    document.cookie = "permission=Agree";
});

PlayButton.addEventListener("click", () => {
    StartoverlayPage.style.display = "none";
});