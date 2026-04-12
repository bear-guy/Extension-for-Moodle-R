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
    
    modal.addEventListener("click", function() {
      modal.style.display = "none";
    });
  }
});