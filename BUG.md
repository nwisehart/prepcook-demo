# Sharing a list fails for a user who exists

**Steps to reproduce**

1. Sign in as Ben (ben@example.com).
2. Open the "Weekend" list.
3. Under "Share", type `Ann@Example.com` and press **Share**.

**Expected:** the list is shared, and Ann sees "Weekend" under "Shared with me" when she signs in.

**Actual:** the page says "No user with that email". Ann definitely has an account — she signs in every day.

It seems to work when the email is typed in lower case, sometimes? Not sure if that's related.
