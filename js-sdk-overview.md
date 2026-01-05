# JavaScript SDK

## Getting Started

### Step 1: Make sure the GrowSurf Universal Code is installed

When you have the [GrowSurf Universal Code](https://docs.growsurf.com/getting-started#step-1-choose-where-to-install-growsurf) installed on a webpage, that webpage has access to the JavaScript SDK, and you are ready for development. You can test this by entering [`growsurf.open()`](https://docs.growsurf.com/developer-tools/api-reference#open-growsurf-window) in your browser's Developer Console.

The unique program ID from your GrowSurf Universal Code is the program that is the target. [Click here for image](https://blobscdn.gitbook.com/v0/b/gitbook-28427.appspot.com/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-LfU8ACBJhil-h8kFAU6%2F-LfU8CXlMq8GdEnHEwxt%2FScreen%20Shot%20on%202019-05-22%20at%2018%3A43%3A17.png?alt=media\&token=3778b13a-db9b-43d3-bce0-eef707391e8a).

{% hint style="warning" %}
**Testing in development?**

* If you are testing on a development URL (e.g., `http://localhost:3000`), you will need to whitelist that URL in the Installation step of the *Program Editor*. [Click here for image](https://blobscdn.gitbook.com/v0/b/gitbook-28427.appspot.com/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-LfU8FwcsZe9b-yjChHs%2F-LfU8rnazUxtZgHvmI4x%2FScreen%20Shot%20on%202019-05-22%20at%2018%3A47%3A27.png?alt=media\&token=d82bbd8e-bff3-471d-af16-3d9edc45facb).
* We recommend creating two different programs for development and production environments. [Learn more here](https://support.growsurf.com/article/262-how-can-i-test-in-a-sandbox-or-development-environment).
  {% endhint %}

## **`grsfReady` Event Listener**

The GrowSurf Universal Code loads asynchronously. Therefore, if you intend to execute any `growsurf` functions on page load, you must wait until the library has completely loaded.&#x20;

When loaded successfully, the GrowSurf Universal Code will dispatch a `grsfReady` event, notifying any event listeners that it is ready for use. Only then will any GrowSurf JavaScript SDK functions work.

### Example of using `grsfReady`

```javascript
// Listen and wait for the Growsurf Universal Code to initialize
window.addEventListener('grsfReady', () => {
  console.log('GrowSurf is Ready!');
  // Your code goes here... 
});
```

In some cases, the GrowSurf Universal script may already be available and the  `grsfReady` event may have already fired. This depends on how long it takes your scripts to load and can happen for various other reasons. \
\
If your `grsfReady`callback isn't being invoked on the`grsfReady` event we recommend you check to see if the `growsurf` script is already available before adding the event listener callback with a conditional like this...

```javascript
// Check to see if GrowSurf is available
if(!window.growsurf) {
  // Listen and wait for the Growsurf Universal Code to initialize
  window.addEventListener('grsfReady', () => {
    console.log('GrowSurf is Ready!');
    // Your code goes here... 
  });
} else {
  console.log('GrowSurf is Already Available');
  // Your code goes here...
}
```

If you are executing `growsurf` functions *not* on page load, we recommend you wrap them in a conditional like this...

### Example of using a conditional

```javascript
// Check if the GrowSurf Universal Code is present
if (window.growsurf) {
    // Then, open the GrowSurf window
    growsurf.open();
}
```

## **URL Parameters**

On any webpage where you have GrowSurf installed (including the GrowSurf-hosted referral portal), you can use the `grsf_email` URL parameter to ensure that when someone lands on the page, they see their unique referral link right away instead of a signup form.

For example, when an existing participant lands on `https://grow.surf/abc123?grsf_email=bob@loblaw.com`, they can instantly access their unique referral link without needing to log in. Conversely, if it's a non-existing participant, they will be added to your program as a participant, skipping the signup process and seeing their unique link immediately.

{% hint style="info" %}
**Other tips**:

* Using grsf\_email is also useful for adding new participants on the fly (i.e., when a person shows high intent to share, they land on your referral portal, and only then are they added to your GrowSurf program).
* Setting `grsf_first_name` and `grsf_last_name` will also set the participant's first name and last name, respectively, if the participant was newly added.
  {% endhint %}

### List of URL Parameters

| **URL Parameter** | **Description**                                                                                                                                                                                    | **Example URL**                                                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `grsf_email`      | Set this value if you want to automatically add a new participant, or return an existing participant                                                                                               | `https://grow.surf/abc123/grsf_email=bob@loblaw.com`                                                                                                       |
| `grsf_first_name` | (Only applies if `grsf_email` is set) Set this value if you want to add a new participant with a first name                                                                                        | <p><code><https://grow.surf/abc123?grsf_email=bob@loblaw.com></code><br><code>\&grsf\_first\_name=Bob</code></p>                                           |
| `grsf_last_name`  | (Only applies if `grsf_email` is set) Set this value if you want to add a new participant with a last name                                                                                         | <p><code><https://grow.surf/abc123?grsf_email=bob@loblaw.com></code><br><code>\&grsf\_first\_name=Bob</code><br><code>\&grsf\_last\_name=Loblaw</code></p> |
| `grsf`            | (Read-Only) This value represents the referrer's unique GrowSurf ID. You never have to worry about setting this value, as it gets automatically generated in  participant's unique referral links. | `https://yoursite.com?grsf=z7o8au`                                                                                                                         |

## **Next Steps**

* [View Tutorials](https://docs.growsurf.com/developer-tools/javascript-sdk/tutorials)
* [View Embeddable Elements](https://docs.growsurf.com/developer-tools/embeddable-elements)
* [View Single Page Applications](https://docs.growsurf.com/developer-tools/javascript-sdk/single-page-applications)
* [View API Reference](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference)
