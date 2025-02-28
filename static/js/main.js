document.addEventListener('DOMContentLoaded', function() {
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

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
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

    // Enhanced form interaction
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
});