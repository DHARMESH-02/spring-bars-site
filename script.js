const products = [
  {
    id: "SB-DF-18",
    name: "Double Flange Spring Bars",
    tag: "standard",
    description: "Everyday replacement spring bars for watch repair counters and strap sellers.",
    size: "8-24 mm",
    diameter: "1.5 / 1.8 mm",
    moq: 1000,
  },
  {
    id: "SB-QR-20",
    name: "Quick Release Spring Bars",
    tag: "quick",
    description: "Built-in lever pins for leather, silicone, and fashion strap production.",
    size: "14-24 mm",
    diameter: "1.5 / 1.8 mm",
    moq: 2000,
  },
  {
    id: "SB-HD-22",
    name: "Heavy Duty Spring Bars",
    tag: "heavy",
    description: "Thicker bars for diver-style watches, steel bracelets, and rugged straps.",
    size: "18-24 mm",
    diameter: "2.0 / 2.5 mm",
    moq: 1000,
  },
  {
    id: "SB-CV-20",
    name: "Curved Spring Bars",
    tag: "standard",
    description: "Curved profile for snug-fitting straps and shaped watch cases.",
    size: "18-22 mm",
    diameter: "1.8 mm",
    moq: 1000,
  },
  {
    id: "SB-SL-20",
    name: "Shoulderless Spring Bars",
    tag: "heavy",
    description: "Clean end profile for drilled lug cases and high-security strap fitting.",
    size: "16-24 mm",
    diameter: "1.8 / 2.0 mm",
    moq: 1500,
  },
  {
    id: "SB-AS-360",
    name: "360 Piece Assortment Box",
    tag: "assortment",
    description: "Dealer-ready replacement kit with multiple lengths and labeled sections.",
    size: "8-24 mm",
    diameter: "Mixed",
    moq: 100,
  },
];

const grid = document.querySelector("#productGrid");
const cartItems = document.querySelector("#cartItems");
const cartTotal = document.querySelector("#cartTotal");
const filters = document.querySelectorAll(".filter");
const cart = new Map();

function formatPieces(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function renderProducts(activeFilter = "all") {
  const visible = products.filter((product) => activeFilter === "all" || product.tag === activeFilter);

  grid.innerHTML = visible
    .map(
      (product) => `
      <article class="product-card">
        <div class="product-top">
          <div>
            <h3>${product.name}</h3>
            <p>${product.description}</p>
          </div>
          <span class="pill">${product.id}</span>
        </div>
        <ul class="spec-list">
          <li><span>Size range</span><strong>${product.size}</strong></li>
          <li><span>Diameter</span><strong>${product.diameter}</strong></li>
          <li><span>MOQ</span><strong>${formatPieces(product.moq)} pcs</strong></li>
        </ul>
        <div class="product-actions">
          <input class="qty" type="number" min="${product.moq}" step="${product.moq}" value="${product.moq}" aria-label="Quantity for ${product.name}" />
          <button class="button primary add-button" type="button" data-id="${product.id}">Add to enquiry</button>
        </div>
      </article>
    `
    )
    .join("");
}

function renderCart() {
  if (!cart.size) {
    cartItems.innerHTML = '<p class="empty">No items added yet.</p>';
    cartTotal.textContent = "0";
    return;
  }

  let total = 0;
  cartItems.innerHTML = Array.from(cart.values())
    .map((item) => {
      total += item.qty;
      return `
        <div class="cart-row">
          <span><strong>${item.name}</strong>${item.id}</span>
          <span>${formatPieces(item.qty)} pcs</span>
        </div>
      `;
    })
    .join("");
  cartTotal.textContent = formatPieces(total);
}

filters.forEach((button) => {
  button.addEventListener("click", () => {
    filters.forEach((filter) => filter.classList.remove("is-active"));
    button.classList.add("is-active");
    renderProducts(button.dataset.filter);
  });
});

grid.addEventListener("click", (event) => {
  const button = event.target.closest(".add-button");
  if (!button) return;

  const card = button.closest(".product-card");
  const qtyInput = card.querySelector(".qty");
  const product = products.find((item) => item.id === button.dataset.id);
  const qty = Math.max(Number(qtyInput.value) || product.moq, product.moq);
  const existing = cart.get(product.id);

  cart.set(product.id, {
    id: product.id,
    name: product.name,
    qty: existing ? existing.qty + qty : qty,
  });

  renderCart();
});

document.querySelector(".quote-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button");
  button.textContent = "Quote request prepared";
  setTimeout(() => {
    button.textContent = "Prepare quote request";
  }, 2200);
});

renderProducts();
renderCart();
