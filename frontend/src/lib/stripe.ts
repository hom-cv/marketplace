/**
 * Stripe.js loader singleton.
 *
 * loadStripe must be called once per page load, outside of React state, so the
 * <Elements> provider always receives the same Promise<Stripe>.
 */
import { loadStripe } from "@stripe/stripe-js";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

export const stripePromise = publishableKey ? loadStripe(publishableKey) : null;
