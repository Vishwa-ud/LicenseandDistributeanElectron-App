const express = require('express');
const stripe = require('stripe')('sk_test_51PBff92LxlKPHBMAiyaAfpPv4m43et8Lo3JSoce8Vy6hODBwhwcOghK5UnPWsKEqHN1B0KYScn4raFtoFaYQh5tW00MSqrccuW');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Route to create a checkout session
app.post('/create-checkout-session', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'License key', // Replace with your product name
            },
            unit_amount: 1000, // Replace with the actual price in cents (e.g., $10.00 USD)
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'http://localhost:3000/success.html', // Replace with your success URL
      cancel_url: 'http://localhost:3000/cancel.html', // Replace with your cancel URL
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
