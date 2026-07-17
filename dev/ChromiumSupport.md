 Chrome manifest v3 webrequest blocking

In Chrome Extensions Manifest V3 (MV3), the core shift regarding network interception is that the webRequestBlocking permission has been completely removed for standard consumer extensions.  

If you try to load a standard MV3 extension that uses webRequest.onBeforeRequest.addListener(..., ["blocking"]), it will throw a fatal error.

Here is the breakdown of what has changed, how to implement blocking now, and the one major exception.
1. The New Standard: declarativeNetRequest (DNR)

Instead of intercepting a request via a JavaScript callback to decide its fate in real time, you now register rules ahead of time. Chrome evaluates these rules natively in the browser's core thread before the request hits the network.
Setting up the Manifest (manifest.json)

You must drop webRequestBlocking and request declarativeNetRequest. Note that simple blocking via DNR does not require host permissions (like <all_urls>), which speeds up the extension store review process.  
JSON

{
  "manifest_version": 3,
  "name": "Network Blocker",
  "version": "1.0",
  "permissions": [
    "declarativeNetRequest"
  ],
  "declarative_net_request": {
    "rule_resources": [{
      "id": "ruleset_1",
      "enabled": true,
      "path": "rules.json"
    }]
  }
}

Defining Static Rules (rules.json)

Create the rule file matching the path specified above. A basic rule blocking a specific tracking domain looks like this:
JSON

[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "||badtracker.com",
      "resourceTypes": ["script", "sub_frame", "xmlhttprequest"]
    }
  }
]

Adding Rules Programmatically (Dynamic Rules)

If your extension needs to block domains on the fly based on user actions, you can manipulate dynamic rules inside your background service worker:
JavaScript

// Adding a block rule dynamically at runtime
chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [{
    id: 101,
    priority: 1,
    action: { type: "block" },
    condition: {
      urlFilter: "example.com/annoying-script.js",
      resourceTypes: ["script"]
    }
  }],
  removeRuleIds: [101] // Clears the rule if it already exists
});

2. Can you still use chrome.webRequest at all?

Yes, but only for observation.
The webRequest API remains completely functional in MV3 for non-blocking operations. If you want to log URLs, read headers, or telemetry analysis without modifying the packet stream, you still request webRequest and your specific host_permissions in the manifest.  
JavaScript

// This works perfectly fine in MV3 for tracking metrics
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    console.log("User visited:", details.url);
  },
  { urls: ["<all_urls>"] } // Requires host permissions
);

3. The Enterprise Loophole

There is one major exception to the death of webRequestBlocking: Enterprise Policy-installed extensions.

If an extension is deployed via forced Chrome Enterprise or Education environment policies (using ExtensionInstallForcelist), webRequestBlocking is fully supported in Manifest V3. Google preserved this specifically so deep enterprise security suites, custom data loss prevention (DLP) agents, and internal proxy layers wouldn't break.  

If you are developing an internal corporate tool meant to be pushed via Active Directory or Google Workspace Admin console, you can continue using the classic blocking approach seamlessly.

Will that method work for FireFox also?

Yes, the code will work on Firefox, but there is a major twist you should know about.

Firefox's Manifest V3 (MV3) architecture takes a very different approach from Chrome's when it comes to network interception.  
1. The Good News: Cross-Browser Compatibility

Firefox has implemented full support for the declarativeNetRequest (DNR) API. If you build your extension using the DNR ruleset pattern (manifest.json using rule_resources and rules.json), it will run seamlessly on both Chrome and Firefox.  

If your goal is a single codebase that scales across both stores, writing it the "Chrome way" via DNR is future-proof and perfectly compatible with Firefox.
2. The Firefox Twist: webRequestBlocking Still Lives

Here is where the two browsers split: Mozilla completely refused to remove the classic webRequestBlocking API for consumer extensions.

Even under Manifest V3, Firefox explicitly permits developers to keep using standard, programmatic blocking callbacks.
JavaScript

// This is perfectly valid in a Firefox Manifest V3 Extension!
browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.url.includes("badtracker.com")) {
      return { cancel: true };
    }
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

Why did Mozilla do this?

Mozilla argued that forcing a purely declarative API limits the capabilities of sophisticated content blockers and privacy tools (like uBlock Origin), which use complex, runtime algorithms rather than simple list-matching. Because of this stance, advanced ad-blockers running in Firefox MV3 are functionally more powerful than their Chrome consumer counterparts.  
Summary Strategy

If you are developing a cross-browser tool, you have two choices:

    The Unified Route (Easiest): Use declarativeNetRequest. It works everywhere and requires less code maintenance.  

    The Split Route (For Advanced Performance): Write a shared service worker core, but use a build tool (like Extension.js, WXT, or Plasmo) to compile dynamic DNR rules for Chrome, while utilizing standard programmatic webRequest blocking for Firefox to leverage its full capabilities.  

What about Safari?

Safari's history with content blocking heavily influenced how Manifest V3 looks today. In fact, Google largely based the declarativeNetRequest (DNR) model on Safari’s native content blocking architecture.  

If you are developing for Safari using Manifest V3, the declarativeNetRequest method works, but Apple enforces its own strict guardrails.  
1. The Good: declarativeNetRequest Compatibility

Safari fully supports Manifest V3 extensions and implements the standard declarativeNetRequest API. If you write a cross-browser extension using the static rules.json file or dynamic rules via JavaScript, it will behave exactly the same way in Safari as it does in Chrome and Firefox.  

However, Safari handles standard host permissions slightly differently. For rules that go beyond basic blocking (like redirect or modifyHeaders), Safari explicitly requires the declarativeNetRequestWithHostAccess permission in your manifest, and the user must explicitly grant the extension access to those websites.  
2. The Bad: webRequestBlocking is Dead in Safari

Unlike Firefox, which stubbornly kept the old API alive for advanced extensions, Apple followed Chrome's lead. webRequestBlocking is completely unavailable for Safari Web Extensions. You cannot use real-time JavaScript callbacks to modify or block traffic dynamically; you must rely entirely on declarative rulesets.  
3. The Safari Twist: Native Content Blockers

Apple provides a completely different path if you want maximum efficiency on iOS and macOS: Safari App Extensions (Native Content Blockers).

Instead of using the standard WebExtensions framework (JavaScript/Manifest files), you can compile a native app that bundles a blockerList.json.

    How it works: Your app delivers a JSON list of triggers and actions directly to the macOS/iOS operating system. Safari handles the blocking at the compile layer before the page even loads.

    Why it matters: This is the only way to do hyper-efficient, system-level ad blocking on iPhones and iPads without draining the battery or introducing execution latency. Popular blockers like AdGuard and 1Blocker use this native method on Apple platforms rather than standard cross-browser Manifest V3 extensions.

The Executive Summary for Cross-Browser Extension Devs

If you are trying to write a single extension codebase that covers all major platforms:
Browser	Manifest V3 DNR Support	Old webRequestBlocking Allowed?	Key Nuance
Chrome	Yes	No (Except Enterprise)	Standard baseline for the web.
Firefox	Yes	Yes	Gives developers maximum granular power.
Safari	Yes	No	Heavy emphasis on user-granted site permissions.

Great, I'm asking for a friend who wrote a IDN homograph blocker for FireFox and wants to support more browsers. https://github.com/feldegast/url-lookalike-blocker

An Internationalized Domain Name (IDN) homograph blocker presents a highly specific, complex challenge when migrating from Firefox to Chrome and Safari. Because an extension must inspect every unique outgoing URL at runtime to see if it contains lookalike characters (like swapping a Latin 'a' for a Cyrillic 'а'), it completely breaks under a purely static declarative system.

If your friend's Firefox code relies on evaluating a regular expression or a character-mapping algorithm inside webRequest.onBeforeRequest, a direct port to Chrome or Safari will fail because declarativeNetRequest (DNR) expects a static or dynamic list of specific text filters (urlFilter), not an active algorithm.

However, there are two solid architecture paths they can take to support Chrome and Safari.
The Cross-Browser Solution: Intercept at the Navigation Layer

Because they can't intercept the raw network request programmatically, they should shift their defense to the browser navigation lifecycle. The chrome.webNavigation API is fully supported across Chrome, Firefox, and Safari in Manifest V3.

Instead of blocking the network request silently mid-flight, the extension listens for a user navigating to a tab, instantly parses the URL, and drops an internal redirect or updates the tab to a safe "blocked" landing page.
The Service Worker Code (background.js)
JavaScript

// Listen for when a tab starts committing to a new URL
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  // Ignore frames (sub-resources) - look only at main page navigation
  if (details.frameId !== 0) return;

  const url = details.url;

  // Run the homograph inspection logic
  if (isHomographAttack(url)) {
    // Redirect the user to an internal blocker page bundled with the extension
    const blockPage = chrome.runtime.getURL("blocked.html") + "?url=" + encodeURIComponent(url);
    
    chrome.tabs.update(details.tabId, { url: blockPage });
  }
}, { url: [{ urlMatches: "http://*/*" }, { urlMatches: "https://*/*" }] });

function isHomographAttack(urlStr) {
  // Friend's existing algorithm parsing punycode / lookalike characters
  // Returns true if a spoof attempt is detected
  return false; 
}

Why this works well for a Homograph Blocker:

    User Experience: Homograph attacks (phishing) target the address bar. Sub-resource assets (like an image loaded from a tracking domain) rarely matter for homograph spoofing; it's the main site identity that carries the risk. webNavigation catches the main frame perfectly.

    Native UX: It lets them build a nice blocked.html interstitial page explaining why the page was blocked, similar to Chrome's native malware warnings, which is a cleaner experience than a broken network connection.

Alternative: Pre-calculating Dynamic DNR Rules (Heavy Lift)

If they absolutely insist that the network request must be blocked at the core browser engine layer via declarativeNetRequest, they will have to change their paradigm from reactive to proactive.

The extension worker cannot evaluate the URL in real-time, but it can register dynamic rules.

    The extension could maintain a local or synced dictionary of high-risk targeted brands (e.g., paypal, google, bankofamerica).

    At startup, the background script could programmatically generate the homograph permutations for those specific words using their lookalike algorithm.

    They inject those variations into Chrome's dynamic rule store:

JavaScript

// Pre-generating known spoof vectors at extension startup
const lookalikePatterns = ["*://*.pаypаl.com/*", "*://*.gооglе.com/*"]; // Using Cyrillic variants

const rules = lookalikePatterns.map((pattern, index) => ({
  id: index + 1,
  priority: 1,
  action: { type: "block" },
  condition: { urlFilter: pattern, resourceTypes: ["main_frame"] }
}));

chrome.declarativeNetRequest.updateDynamicRules({
  addRules: rules
});

    The Catch: Chrome caps dynamic rules at 30,000 rules per extension. While 30,000 sounds like a lot, mathematical permutations of lookalike domains expand exponentially, making a broad, catch-all algorithmic blocker impossible via this method.

Platform Recommendations for url-lookalike-blocker

    For Firefox: Keep using the existing webRequestBlocking code. It's the most robust implementation possible because it blocks the network stream instantly for both main frames and hidden sub-resources.

    For Chrome & Safari: Use the webNavigation.onBeforeNavigate approach. It bypasses the strict DNR limitations entirely by focusing on the tab's navigation state rather than the packet stream, providing excellent protection against phishing links.