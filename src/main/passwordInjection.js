function randomDelay(min = 50, max = 150) {
  return new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));
}

async function autofillInput(page, selector, value) {
  try {
    await page.evaluate(({ selector, value }) => {
      const element = document.querySelector(selector);
      if (!element) return false;
      element.focus();
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
      element.setAttribute('data-autofilled', 'true');

      return true;
    }, { selector, value });

    return true;
  } catch (error) {
    console.error(`Error autofilling ${selector}:`, error);
    return false;
  }
}

async function fillLoginForm(page, username, password) {
  try {
    await randomDelay(100, 300);
    
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

    const passwordSelectors = [
      'input[type="password"]',
      'input[autocomplete="current-password"]',
      'input[name*="pass" i]',
      'input[id*="pass" i]'
    ];

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
        continue;
      }
    }

    if (!usernameFilled) {
      console.warn('Could not find username field');
      return false;
    }

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

function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (error) {
    return url;
  }
}

function matchesPasswordUrl(currentUrl, savedUrl) {
  try {
    if (!currentUrl || !currentUrl.startsWith('http')) {
      return false;
    }
    
    const currentDomain = extractDomain(currentUrl);
    const savedDomain = extractDomain(savedUrl);
    
    if (!currentDomain || !savedDomain) {
      return false;
    }
    
    return currentDomain.includes(savedDomain) || savedDomain.includes(currentDomain);
  } catch (error) {
    return false;
  }
}

async function setupPasswordAutoFill(page, passwords) {
  if (!passwords || passwords.length === 0) {
    return;
  }

  console.log(`Setting up password auto-fill for ${passwords.length} saved credential(s)`);

  const filledUrls = new Set();
  let isCurrentlyFilling = false;
  let lastFilledTime = 0;
  const FILL_COOLDOWN = 1500;

  const checkAndFill = async () => {
    if (isCurrentlyFilling) {
      return;
    }

    const now = Date.now();
    if (now - lastFilledTime < FILL_COOLDOWN) {
      return;
    }

    try {
      isCurrentlyFilling = true;
      const currentUrl = page.url();
      
      if (filledUrls.has(currentUrl)) {
        return;
      }
      
      const matchingPassword = passwords.find(pwd => matchesPasswordUrl(currentUrl, pwd.url));
      
      if (matchingPassword) {
        console.log(`Found matching credentials for: ${currentUrl}`);
        
        try {
          await page.waitForLoadState('networkidle', { timeout: 10000 });
        } catch (timeoutError) {
          console.log('Network idle timeout, proceeding anyway');
        }
        
        await randomDelay(100, 300);
        
        const success = await fillLoginForm(page, matchingPassword.username, matchingPassword.password);
        
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

  page.on('load', async () => {
    await checkAndFill();
  });

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
