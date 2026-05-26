document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImage");
  
  if (modal && modalImg) {
    document.querySelectorAll(".feature-img").forEach(img => {
      img.addEventListener("click", function() {
        modal.style.display = "flex";
        modalImg.src = this.src;
      });
    });
    
    const closeModal = () => {
      modal.style.display = "none";
    };

    modal.addEventListener("click", closeModal);

    // Escキーでモーダルを閉じる
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.style.display === "flex") {
        closeModal();
      }
    });
  }
});