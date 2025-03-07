
// Main JavaScript for Rendang and Refresh

document.addEventListener('DOMContentLoaded', function() {
    // Announcement banner functionality
    const announcementBanner = document.querySelector('.announcement-banner');
    const closeAnnouncement = document.querySelector('.close-announcement');
    const navbar = document.querySelector('.navbar');
    // Use CSS variable for consistency
    const bannerHeight = 45; // Matching --banner-height CSS variable

    function adjustNavbarPosition(bannerVisible) {
        if (navbar) {
            if (bannerVisible) {
                navbar.style.top = `${bannerHeight}px`;
                document.body.style.paddingTop = `${bannerHeight + 60}px`;
            } else {
                navbar.style.top = '0';
                document.body.style.paddingTop = '60px';
            }
            if (!bannerVisible) {
                navbar.style.top = '0';
                document.body.style.paddingTop = `${navbar.offsetHeight}px`;
            } else {
                navbar.style.top = `${bannerHeight}px`;
                document.body.style.paddingTop = `${bannerHeight + navbar.offsetHeight}px`;
            }
        }
    }

    if (closeAnnouncement && announcementBanner) {
        // Check if user has previously closed the banner
        const isAnnouncementClosed = localStorage.getItem('announcementClosed');

        if (isAnnouncementClosed === 'true') {
            announcementBanner.classList.add('hidden');
            adjustNavbarPosition(false);
        } else {
            announcementBanner.classList.remove('hidden');
            adjustNavbarPosition(true);
        }

        closeAnnouncement.addEventListener('click', () => {
            announcementBanner.classList.add('hidden');
            // Store user preference
            localStorage.setItem('announcementClosed', 'true');
            adjustNavbarPosition(false);
        });
    }

    // Navigation toggle and scroll behavior
    const navbarToggle = document.querySelector('.navbar-toggle');
    const navbarMenu = document.querySelector('.navbar-menu');

    // Toggle mobile menu
    if (navbarToggle && navbarMenu) {
        navbarToggle.addEventListener('click', () => {
            navbarMenu.classList.toggle('active');
        });
    }

    // Scroll behavior
    window.addEventListener('scroll', () => {
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    });

    // Menu and order functionality
    const menuItems = document.querySelectorAll('.menu-item');
    const orderDetailsTextarea = document.getElementById('order_details');
    const orderForm = document.getElementById('order-form');
    const orderMessage = document.getElementById('order-message');
    
    // Track selected items
    let selectedItems = {};

    // Handle quantity changes
    menuItems.forEach(item => {
        const plusBtn = item.querySelector('.plus');
        const minusBtn = item.querySelector('.minus');
        const quantityElement = item.querySelector('.quantity');
        
        if (plusBtn && minusBtn && quantityElement) {
            const itemId = plusBtn.getAttribute('data-id');
            const itemName = plusBtn.getAttribute('data-name');
            const itemPrice = parseFloat(plusBtn.getAttribute('data-price'));
            
            plusBtn.addEventListener('click', () => {
                let quantity = parseInt(quantityElement.textContent);
                quantity++;
                quantityElement.textContent = quantity;
                
                // Update selected items
                selectedItems[itemId] = {
                    name: itemName,
                    price: itemPrice,
                    quantity: quantity
                };
                
                updateOrderDetails();
            });
            
            minusBtn.addEventListener('click', () => {
                let quantity = parseInt(quantityElement.textContent);
                if (quantity > 0) {
                    quantity--;
                    quantityElement.textContent = quantity;
                    
                    if (quantity === 0) {
                        delete selectedItems[itemId];
                    } else {
                        selectedItems[itemId].quantity = quantity;
                    }
                    
                    updateOrderDetails();
                }
            });
        }
    });
    
    // Update order details textarea
    function updateOrderDetails() {
        if (orderDetailsTextarea) {
            let orderText = '';
            let total = 0;
            
            for (const itemId in selectedItems) {
                const item = selectedItems[itemId];
                const itemTotal = item.price * item.quantity;
                orderText += `${item.name} x${item.quantity} - $${itemTotal.toFixed(2)}\n`;
                total += itemTotal;
            }
            
            if (orderText) {
                orderText += `\nTotal: $${total.toFixed(2)}`;
            }
            
            orderDetailsTextarea.value = orderText;
        }
    }
    
    // Handle order submission
    if (orderForm) {
        orderForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Check if there are items in the order
            if (Object.keys(selectedItems).length === 0) {
                orderMessage.textContent = 'Please select at least one item to order.';
                orderMessage.classList.add('error');
                return;
            }
            
            // Get form data
            const formData = new FormData(orderForm);
            
            // Submit order
            fetch('/submit_order', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    orderMessage.textContent = data.message;
                    orderMessage.classList.remove('error');
                    orderMessage.classList.add('success');
                    
                    // Reset form and selected items
                    orderForm.reset();
                    selectedItems = {};
                    menuItems.forEach(item => {
                        const quantityElement = item.querySelector('.quantity');
                        if (quantityElement) {
                            quantityElement.textContent = '0';
                        }
                    });
                } else {
                    orderMessage.textContent = data.message;
                    orderMessage.classList.add('error');
                    orderMessage.classList.remove('success');
                }
            })
            .catch(error => {
                orderMessage.textContent = 'An error occurred. Please try again.';
                orderMessage.classList.add('error');
                orderMessage.classList.remove('success');
                console.error('Error:', error);
            });
        });
    }
    
    // Order lookup functionality
    const lookupForm = document.getElementById('lookup-form');
    const lookupResults = document.getElementById('lookup-results');
    const lookupMessage = document.getElementById('lookup-message');
    
    if (lookupForm && lookupResults && lookupMessage) {
        lookupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const searchType = document.getElementById('search_type').value;
            const searchValue = document.getElementById('search_value').value;
            
            fetch('/search_order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    search_type: searchType,
                    search_value: searchValue
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Clear previous results
                    lookupResults.innerHTML = '';
                    lookupMessage.textContent = '';
                    lookupMessage.className = 'lookup-message';
                    
                    // Display orders
                    data.orders.forEach(order => {
                        const orderCard = document.createElement('div');
                        orderCard.className = 'order-card';
                        
                        orderCard.innerHTML = `
                            <h3>Order from ${order.name}</h3>
                            <p class="order-date">Date: ${order.timestamp}</p>
                            <div class="order-details">
                                <p><strong>Email:</strong> ${order.email}</p>
                                <p><strong>Phone:</strong> ${order.phone}</p>
                                <p><strong>Order Details:</strong></p>
                                <pre>${order.order_details}</pre>
                                ${order.special_instructions ? `
                                <p><strong>Special Instructions:</strong></p>
                                <pre>${order.special_instructions}</pre>
                                ` : ''}
                            </div>
                        `;
                        
                        lookupResults.appendChild(orderCard);
                    });
                } else {
                    lookupResults.innerHTML = '';
                    lookupMessage.textContent = data.message;
                    lookupMessage.classList.add('error');
                }
            })
            .catch(error => {
                lookupResults.innerHTML = '';
                lookupMessage.textContent = 'An error occurred. Please try again.';
                lookupMessage.classList.add('error');
                console.error('Error:', error);
            });
        });
    }
});
