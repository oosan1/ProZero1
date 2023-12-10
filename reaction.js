const AgreeButton = document.getElementById("AgreeButton");
const AgreePage = document.getElementById("agree");
const PlayButton = document.getElementById("PlayButton");
const RulePage = document.getElementById("rule");
const StartoverlayPage = document.getElementById("StartOverlay");

if (localStorage.getItem("permission") == "Agree") {
    AgreePage.style.display = "none";
    RulePage.style.display = "block";
}
AgreeButton.addEventListener("click", () => {
    AgreePage.style.display = "none";
    RulePage.style.display = "block";
    localStorage.setItem("permission", "Agree");
});

PlayButton.addEventListener("click", () => {
    StartoverlayPage.style.display = "none";
});