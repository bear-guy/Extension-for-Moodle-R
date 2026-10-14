document.addEventListener('DOMContentLoaded', () => {
  // PayPay ID などのコピーボタン
  document.querySelectorAll('.copy-btn[data-copy]').forEach(btn => {
    const label = btn.textContent;
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.textContent = btn.dataset.copied;
        setTimeout(() => { btn.textContent = label; }, 2000);
      } catch (e) {
        // クリップボードが使えない環境では、ID を選択状態にして手動でコピーしてもらう
        const target = btn.parentElement.querySelector('strong');
        if (target) window.getSelection().selectAllChildren(target);
      }
    });
  });

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