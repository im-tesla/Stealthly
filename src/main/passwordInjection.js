/**
 * Password Injection Module
 * Automatically fills login forms with saved credentials in a human-like manner
 * to avoid bot detection
 */

/**
 * Wait for a random duration to simulate human behavior
 */
function randomDelay(min = 50, max = 150) {
  return new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));
}

/**
 * Fill input field using Chrome's native autofill mechanism
 * This simulates Chrome's autofill feature rather than human typing
 */
async function autofillInput(page, selector, value) {
  try {
    await page.evaluate(({ selector, value }) => {
      const element = document.querySelector(selector);
      if (!element) return false;

      // Focus the element first (like Chrome does)
      element.focus();

      // Set the value directly (like autofill does)
      element.value = value;

      // Dispatch input event (Chrome autofill triggers this)
      element.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Dispatch change event
      element.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Some sites listen for keyup/keydown, so trigger those too
      element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

      // Mark as autofilled (Chrome adds this attribute)
      element.setAttribute('data-autofilled', 'true');

      return true;
    }, { selector, value });

    return true;
  } catch (error) {
    console.error(`Error autofilling ${selector}:`, error);
    return false;
  }
}

/**
 * Find and fill login forms on the page
 * Uses Chrome's autofill mechanism to fill fields instantly
 */
async function fillLoginForm(page, username, password) {
  try {
    // Wait a bit for the page to fully load
    await randomDelay(100, 300);
    
    // Strategy 1: Common input selectors for username/email
    const usernameSelectors = [
      'input[type="email"]',
      'input[type="text"][name*="user" i]',
      'input[type="text"][name*="email" i]',
      'input[type="text"][id*="user" i]',
      'input[type="text"][id*="email" i]',
      'input[type="text"][placeholder*="email" i]',
      'input[type="text"][placeholder*="username" i]',
      'input[autocomplete="username"]',
      'input[autocomplete="email"]',
      'input[name="username"]',
      'input[name="email"]',
      'input[id="username"]',
      'input[id="email"]',
    ];

    // Strategy 2: Password field selectors
    const passwordSelectors = [
      'input[type="password"]',
      'input[autocomplete="current-password"]',
      'input[name*="pass" i]',
      'input[id*="pass" i]'
    ];

    // Try to find and fill username field
    let usernameFilled = false;
    for (const selector of usernameSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const isVisible = await element.isVisible();
          if (isVisible) {
            console.log(`Found username field: ${selector}`);
            const success = await autofillInput(page, selector, username);
            if (success) {
              usernameFilled = true;
              break;
            }
          }
        }
      } catch (error) {
        // Continue to next selector
        continue;
      }
    }

    if (!usernameFilled) {
      console.warn('Could not find username field');
      return false;
    }

    // Small delay between filling fields (like Chrome autofill)
    await randomDelay(50, 150);

    // Try to find and fill password field
    let passwordFilled = false;
    for (const selector of passwordSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const isVisible = await element.isVisible();
          if (isVisible) {
            console.log(`Found password field: ${selector}`);
            const success = await autofillInput(page, selector, password);
            if (success) {
              passwordFilled = true;
              break;
            }
          }
        }
      } catch (error) {
        // Continue to next selector
        continue;
      }
    }

    if (!passwordFilled) {
      console.warn('Could not find password field');
      return false;
    }

    console.log('✓ Successfully autofilled login form');
    return true;

  } catch (error) {
    console.error('Error filling login form:', error);
    return false;
  }
}

/**
 * Extract domain from URL for matching
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (error) {
    return url;
  }
}

/**
 * Check if current page matches a saved password URL
 */
function matchesPasswordUrl(currentUrl, savedUrl) {
  try {
    // Ignore about:blank and other non-http(s) URLs
    if (!currentUrl || !currentUrl.startsWith('http')) {
      return false;
    }
    
    const currentDomain = extractDomain(currentUrl);
    const savedDomain = extractDomain(savedUrl);
    
    // Ignore if domains are empty
    if (!currentDomain || !savedDomain) {
      return false;
    }
    
    // Check if domains match
    return currentDomain.includes(savedDomain) || savedDomain.includes(currentDomain);
  } catch (error) {
    return false;
  }
}

/**
 * Setup password auto-fill for a page
 * Listens for navigation and automatically fills forms when matching URLs
 */
async function setupPasswordAutoFill(page, passwords) {
  if (!passwords || passwords.length === 0) {
    return;
  }

  console.log(`Setting up password auto-fill for ${passwords.length} saved credential(s)`);

  // Track which URLs have been filled to prevent duplicates
  const filledUrls = new Set();
  let isCurrentlyFilling = false;
  let lastFilledTime = 0;
  const FILL_COOLDOWN = 3000; // 3 seconds cooldown between fills

  // Function to check and fill on the current page
  const checkAndFill = async () => {
    // Prevent concurrent executions
    if (isCurrentlyFilling) {
      return;
    }

    // Check cooldown
    const now = Date.now();
    if (now - lastFilledTime < FILL_COOLDOWN) {
      return;
    }

    try {
      isCurrentlyFilling = true;
      const currentUrl = page.url();
      
      // Skip if already filled this exact URL
      if (filledUrls.has(currentUrl)) {
        return;
      }
      
      // Find matching password for current URL
      const matchingPassword = passwords.find(pwd => matchesPasswordUrl(currentUrl, pwd.url));
      
      if (matchingPassword) {
        console.log(`Found matching credentials for: ${currentUrl}`);
        
        // Wait for network to be idle before filling
        try {
          await page.waitForLoadState('networkidle', { timeout: 10000 });
        } catch (timeoutError) {
          console.log('Network idle timeout, proceeding anyway');
        }
        
        // Small additional delay for safety
        await randomDelay(300, 500);
        
        // Try to fill the form
        const success = await fillLoginForm(page, matchingPassword.username, matchingPassword.password);
        
        // Mark as filled
        if (success) {
          filledUrls.add(currentUrl);
          lastFilledTime = Date.now();
        }
      }
    } catch (error) {
      console.error('Error in auto-fill check:', error);
    } finally {
      isCurrentlyFilling = false;
    }
  };

  // Set up listener for page load (only main frame)
  page.on('load', async () => {
    await checkAndFill();
  });

  // Initial check after a delay
  setTimeout(async () => {
    await checkAndFill();
  }, 1000);
}

module.exports = {
  setupPasswordAutoFill,
  fillLoginForm,
  autofillInput,
  extractDomain,
  matchesPasswordUrl
};
