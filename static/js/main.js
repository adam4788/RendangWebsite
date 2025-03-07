document.addEventListener('DOMContentLoaded', function() {
    // Announcement banner functionality
    const announcementBanner = document.querySelector('.announcement-banner');
    const closeAnnouncement = document.querySelector('.close-announcement');

    if (closeAnnouncement && announcementBanner) {
        // Check if user has previously closed the banner
        const isAnnouncementClosed = localStorage.getItem('announcementClosed');

        if (isAnnouncementClosed) {
            announcementBanner.classList.add('hidden');
            document.body.classList.add('banner-hidden');
        }

        closeAnnouncement.addEventListener('click', () => {
            announcementBanner.classList.add('hidden');
            document.body.classList.add('banner-hidden');
            // Store user preference
            localStorage.setItem('announcementClosed', 'true');
        });
    }

    // Cart state
    let cart = {
        items: {},
        total: 0
    };

    function updateQuantity(id, delta) {
        const menuItem = document.querySelector(`.menu-item[data-id="${id}"]`);
        const plusBtn = menuItem.querySelector('.plus');
        const name = plusBtn.dataset.name;
        const price = parseFloat(plusBtn.dataset.price);

        if (!cart.items[id] && delta > 0) {
            // Adding item for the first time
            cart.items[id] = {
                name: name,
                price: price,
                quantity: 0
            };
        }

        if (cart.items[id]) {
            const newQuantity = (cart.items[id].quantity || 0) + delta;

            if (newQuantity <= 0) {
                delete cart.items[id];
            } else {
                cart.items[id].quantity = newQuantity;
            }

            updateMenuItemQuantity(id, newQuantity);
            updateCartTotal();
            updateCartDisplay();
        }
    }

    function updateMenuItemQuantity(id, quantity = 0) {
        const menuItem = document.querySelector(`.menu-item[data-id="${id}"]`);
        const quantityDisplay = menuItem.querySelector('.quantity');
        const minusBtn = menuItem.querySelector('.minus');

        if (quantityDisplay) {
            quantityDisplay.textContent = quantity;

            // Update minus button state
            if (quantity > 0) {
                minusBtn.style.opacity = '1';
            } else {
                minusBtn.style.opacity = '0.5';
            }
        }
    }

    // Initialize quantity controls
    document.querySelectorAll('.menu-item').forEach(item => {
        const id = item.dataset.id;
        const quantityControls = item.querySelector('.quantity-controls');

        if (quantityControls) {
            const minusBtn = quantityControls.querySelector('.minus');
            const plusBtn = quantityControls.querySelector('.plus');

            minusBtn.addEventListener('click', () => updateQuantity(id, -1));
            plusBtn.addEventListener('click', () => updateQuantity(id, 1));

            // Initialize quantity display
            updateMenuItemQuantity(id, 0);
        }
    });


    // Cart DOM elements
    const cartToggle = document.getElementById('cart-toggle');
    const cartSidebar = document.querySelector('.cart-sidebar');
    const cartOverlay = document.querySelector('.cart-overlay');
    const closeCart = document.querySelector('.close-cart');
    const cartItemsContainer = document.querySelector('.cart-items');
    const cartCount = document.querySelector('.cart-count');
    const totalAmount = document.querySelector('.total-amount');
    const checkoutButton = document.querySelector('.checkout-button');

    // Toggle cart sidebar
    function toggleCart() {
        cartSidebar.classList.toggle('active');
        cartOverlay.classList.toggle('active');
    }

    cartToggle.addEventListener('click', function(e) {
        e.preventDefault();
        toggleCart();
    });

    closeCart.addEventListener('click', toggleCart);
    cartOverlay.addEventListener('click', toggleCart);

    // Add to cart functionality
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', function() {
            const id = this.dataset.id;
            const name = this.dataset.name;
            const price = parseFloat(this.dataset.price);

            addToCart(id, name, price);
            updateCartDisplay();

            // Show cart after adding item
            if (!cartSidebar.classList.contains('active')) {
                toggleCart();
            }
        });
    });

    function addToCart(id, name, price) {
        if (cart.items[id]) {
            cart.items[id].quantity++;
        } else {
            cart.items[id] = {
                name: name,
                price: price,
                quantity: 1
            };

            // Show quantity controls
            const menuItem = document.querySelector(`.menu-item[data-id="${id}"]`);
            const addButton = menuItem.querySelector('.add-to-cart-btn');
            const quantityControls = menuItem.querySelector('.quantity-controls');

            addButton.classList.add('hidden');
            quantityControls.classList.remove('hidden');
        }

        // Update quantity display in menu
        updateMenuItemQuantity(id);
        updateCartTotal();
    }

    function removeFromCart(id) {
        if (cart.items[id]) {
            delete cart.items[id];
            updateCartTotal();
            updateCartDisplay();
        }
    }


    function updateCartTotal() {
        cart.total = Object.values(cart.items).reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);

        // Update display
        totalAmount.textContent = `$${cart.total.toFixed(2)}`;
        cartCount.textContent = Object.values(cart.items).reduce((sum, item) => sum + item.quantity, 0);
    }

    function updateCartDisplay() {
        cartItemsContainer.innerHTML = '';

        for (const [id, item] of Object.entries(cart.items)) {
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn minus" data-id="${id}">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn plus" data-id="${id}">+</button>
                        <button class="quantity-btn remove" data-id="${id}">×</button>
                    </div>
                </div>
            `;
            cartItemsContainer.appendChild(cartItem);

            // Add event listeners to quantity buttons
            cartItem.querySelector('.minus').addEventListener('click', () => updateQuantity(id, -1));
            cartItem.querySelector('.plus').addEventListener('click', () => updateQuantity(id, 1));
            cartItem.querySelector('.remove').addEventListener('click', () => removeFromCart(id));
        }
    }

    // Checkout button handler
    checkoutButton.addEventListener('click', function() {
        if (Object.keys(cart.items).length === 0) {
            alert('Your cart is empty!');
            return;
        }

        // Auto-fill order details in the order form
        const orderDetails = document.getElementById('order_details');
        if (orderDetails) {
            const cartSummary = Object.values(cart.items)
                .map(item => `${item.name} x${item.quantity} ($${(item.price * item.quantity).toFixed(2)})`)
                .join('\n');
            orderDetails.value = cartSummary + `\n\nTotal: $${cart.total.toFixed(2)}`;
        }

        // Scroll to order form
        document.querySelector('#order').scrollIntoView({ behavior: 'smooth' });
        toggleCart();
    });

    //Form validation and submission code from edited snippet
    const orderForm = document.getElementById('order-form');
    const orderMessage = document.getElementById('order-message');
    const formInputs = document.querySelectorAll('.form-group input, .form-group textarea');

    // Add focus effects to form inputs
    formInputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });

        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
            // Validate on blur
            if (this.hasAttribute('required') && !this.value.trim()) {
                this.classList.add('error');
                showInputError(this);
            } else {
                this.classList.remove('error');
                hideInputError(this);
            }
        });
    });

    // Form validation feedback
    function showInputError(input) {
        const errorDiv = input.parentElement.querySelector('.error-message');
        if (!errorDiv) {
            const div = document.createElement('div');
            div.className = 'error-message';
            div.textContent = `Please enter your ${input.placeholder || 'value'}`;
            input.parentElement.appendChild(div);
        }
    }

    function hideInputError(input) {
        const errorDiv = input.parentElement.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    // Order form submission with enhanced feedback
    if (orderForm) {
        orderForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Validate all required fields
            let isValid = true;
            formInputs.forEach(input => {
                if (input.hasAttribute('required') && !input.value.trim()) {
                    isValid = false;
                    input.classList.add('error');
                    showInputError(input);
                }
            });

            if (!isValid) {
                orderMessage.textContent = 'Please fill in all required fields';
                orderMessage.className = 'order-message error';
                return;
            }

            // Show loading state
            const submitButton = orderForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.textContent = 'Submitting...';
            submitButton.disabled = true;

            // Add loading animation
            submitButton.classList.add('loading');

            // Collect form data
            const formData = new FormData(orderForm);

            // Submit the form
            fetch('/submit_order', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                orderMessage.textContent = data.message;
                orderMessage.className = 'order-message ' + (data.success ? 'success' : 'error');

                if (data.success) {
                    orderForm.reset();
                    // Add success animation
                    submitButton.classList.add('success');
                }
            })
            .catch(error => {
                orderMessage.textContent = 'An error occurred. Please try again.';
                orderMessage.className = 'order-message error';
            })
            .finally(() => {
                // Restore button state
                submitButton.textContent = originalButtonText;
                submitButton.disabled = false;
                submitButton.classList.remove('loading');
            });
        });
    }

    // Navigation toggle and scroll behavior
    const navbar = document.querySelector('.navbar');
    const navbarToggle = document.querySelector('.navbar-toggle');
    const navbarMenu = document.querySelector('.navbar-menu');

    // Toggle mobile menu
    navbarToggle.addEventListener('click', function() {
        navbarMenu.classList.toggle('active');
    });

    // Navbar scroll behavior
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            if (this.getAttribute('href') === '#') return;

            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                // Close mobile menu if open
                navbarMenu.classList.remove('active');
            }
        });
    });
    // Scroll reveal animation for sections
    const sections = document.querySelectorAll('section');
    const revealSection = function(entries, observer) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    };

    const sectionObserver = new IntersectionObserver(revealSection, {
        root: null,
        threshold: 0.15
    });

    sections.forEach(section => {
        section.classList.remove('visible'); // Ensure sections start hidden
        sectionObserver.observe(section);
    });


    // Menu item hover effect
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
        });
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    const lookupForm = document.getElementById('lookup-form');
    const lookupResults = document.getElementById('lookup-results');
    const lookupMessage = document.getElementById('lookup-message');

    if (lookupForm) {
        lookupForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const searchType = document.getElementById('search_type').value;
            const searchValue = document.getElementById('search_value').value;

            // Show loading state
            const submitButton = lookupForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.textContent = 'Searching...';
            submitButton.disabled = true;
            submitButton.classList.add('loading');

            // Clear previous results and messages
            lookupResults.innerHTML = '';
            lookupMessage.className = 'lookup-message';
            lookupMessage.textContent = '';

            fetch('/search_order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    search_type: searchType,
                    search_value: searchValue
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    data.orders.forEach(order => {
                        const orderCard = document.createElement('div');
                        orderCard.className = 'order-card';
                        orderCard.innerHTML = `
                            <div class="order-header">
                                <h3>Order Details</h3>
                                <span class="order-date">${order.timestamp}</span>
                            </div>
                            <div class="order-details">
                                <strong>Items:</strong><br>
                                ${order.order_details.split('\n').join('<br>')}
                            </div>
                            <div class="order-meta">
                                <div class="order-meta-item">
                                    <i class="fas fa-user"></i>
                                    <span>${order.name}</span>
                                </div>
                                <div class="order-meta-item">
                                    <i class="fas fa-envelope"></i>
                                    <span>${order.email}</span>
                                </div>
                                <div class="order-meta-item">
                                    <i class="fas fa-phone"></i>
                                    <span>${order.phone}</span>
                                </div>
                            </div>
                            ${order.special_instructions ? `
                                <div class="special-instructions">
                                    <strong>Special Instructions:</strong><br>
                                    ${order.special_instructions}
                                </div>
                            ` : ''}
                        `;
                        lookupResults.appendChild(orderCard);
                    });
                } else {
                    lookupMessage.className = 'lookup-message error';
                    lookupMessage.textContent = data.message;
                }
            })
            .catch(error => {
                lookupMessage.className = 'lookup-message error';
                lookupMessage.textContent = 'An error occurred while searching for your order';
            })
            .finally(() => {
                // Restore button state
                submitButton.textContent = originalButtonText;
                submitButton.disabled = false;
                submitButton.classList.remove('loading');
            });
        });
    }

    // Add event listeners for quantity controls in menu items (This part was already present, but is now integrated with the new updateQuantity and updateMenuItemQuantity functions)
    document.querySelectorAll('.menu-item').forEach(item => {
        const id = item.dataset.id;
        const quantityControls = item.querySelector('.quantity-controls');

        if (quantityControls) {
            const minusBtn = quantityControls.querySelector('.minus');
            const plusBtn = quantityControls.querySelector('.plus');

            minusBtn.addEventListener('click', () => updateQuantity(id, -1));
            plusBtn.addEventListener('click', () => updateQuantity(id, 1));
        }
    });
});