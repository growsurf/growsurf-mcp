# Embeddable Elements

![The Embedded Form and Embedded Invite](https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2FzgfPBom1eDPVEmEne6Zh%2Fimage.png?alt=media\&token=d7a127aa-dd78-4a2e-9874-1b2805f10bc8)

## What are embeddable elements?

* Embeddable elements are one-line-of-code inline block elements that you can insert into your own "Refer and Earn" webpage
* To change basic styles, update elements from the Campaign Editor.
* Embeddable elements can be fully customized using HTML data attributes.
* Some embeddable elements have two UI states that will display differently to participants and non-participants

{% hint style="warning" %}
**Important Notes:**

* You must have the [GrowSurf Universal Code](https://docs.growsurf.com/getting-started#get-the-growsurf-universal-code) installed on the same webpage that embeddable elements are on.
* For troubleshooting auth states, please view [this article ](https://support.growsurf.com/article/208-why-am-i-seeing-the-no-auth-state-of-the-embedded-form-when-i-am-expecting-to-see-the-auth-state)for more details.
* If you don't see styles applied to embedded elements, please check your browser developer console for errors/warnings. Data attributes must be parsable by the [`JSON.parse()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse) function.
  {% endhint %}

***

## (Optional) Forcefully re-rendering embeddable elements

Although embedded elements listen for changes in data attributes and update dynamically, if you run into issues where the embedded elements do not render/refresh, you can force re-rendering. This may be useful if you are working with dynamic data (such as as setting `data-grsf-email` to the user's email in the [Embedded Form](#embedded-form)).&#x20;

To force re-rendering, call `growsurf.initElements()`, which destroys and recreates all embeddable elements in the DOM.

```javascript
growsurf.initElements();
```

Please make sure to wait for the GrowSurf Universal Code to load by using the `grsfReady` event listener. [See an example here](https://docs.growsurf.com/developer-tools/javascript-sdk#grsfready-event-listener).

{% hint style="info" %}
For single-page applications (SPAs), there may be issues with embeddable elements rendering on the page due to how URL routes are handled. In this case, calling `growsurf.initElements()` may not work and you will need to call [`growsurf.init()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#initialize-reinitialize-growsurf) to re-initialize GrowSurf to make the embeddable elements render.
{% endhint %}

***

## **Embedded Form**

The embedded form will display the participant's unique referral link and social sharing options.

<figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2FyTdL11whFiP6ddqebOpl%2FEmbedded%20Share.png?alt=media&#x26;token=bb5888ed-669f-45c2-8f41-e220041a2015" alt=""><figcaption><p>Signed-in participants will see their unique referral link and social sharing options.</p></figcaption></figure>

If the participant is not signed in, then the embedded form will display a signup form.

<figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2FJR1tbjx7meybEkbfFpNC%2FEmbedded%20Signup.png?alt=media&#x26;token=cf34446b-e0df-4a7e-8787-0e2d35cdf46a" alt=""><figcaption><p>Participants who are not signed in will see the signup form</p></figcaption></figure>

**Example usage:**

{% tabs %}
{% tab title="Basic" %}
This is the bare minimum code required to display this element.

```html
<div data-grsf-block-form></div>
```

{% endtab %}

{% tab title="With auth" %}
If you have users logged into your website or web app, you can pass their email address in so that they always see their unique referral link instead of the signup form.

{% hint style="info" %}
**Note:** If you are already setting `data-grsf-email`, `data-grsf-first-name`, or `data-grsf-last-name` on another GrowSurf embedded element, then you do not need to set them here.
{% endhint %}

```html
<!-- Make sure to replace "gavin@hooli.com", "Gavin", and "Belson" with your logged-in user's email address, first name, and last name, respectively. -->
<div data-grsf-block-form
 data-grsf-email="gavin@hooli.com"
 data-grsf-first-name="Gavin"
 data-grsf-last-name="Belson"></div>
```

### Here is an equivalent JavaScript implementation:

Here's what you would have in your HTML file:

```html
<div data-grsf-block-form></div>
```

And here's what you would have in your JavaScript (make sure to use the [`grsfReady`](https://docs.growsurf.com/developer-tools/javascript-sdk#grsfready-event-listener) event listener anytime you call any `growsurf` functions):

```javascript
// Make sure to replace "gavin@hooli.com", "Gavin", and "Belson" with your logged-in user's email address, first name, and last name, respectively.
growsurf.addParticipant({
  email: "gavin@hooli.com",
  firstName: "Gavin",
  lastName: "Belson"
});
```

{% endtab %}

{% tab title="100% customized" %}
This is an example that contains all of the available data attributes that can be customized.

{% hint style="info" %}
**Note:** If you are already setting `data-grsf-email`, `data-grsf-first-name`, or `data-grsf-last-name` on another GrowSurf embedded element, then you do not need to set them here.
{% endhint %}

```html
<!-- Make sure to replace "gavin@hooli.com", "Gavin", and "Belson" with your logged-in user's email address, first name, and last name, respectively. -->
<div data-grsf-block-form
 data-grsf-email="gavin@hooli.com"
 data-grsf-first-name="Gavin"
 data-grsf-last-name="Belson"
 data-grsf-metadata="{'company': 'Hooli, Inc', 'companySize': 10000}"
 data-grsf-label-style="{'color': '#515151', 'font-size': '10px'}"
 data-grsf-gdpr-paragraph-style="{'color': '#222222', 'font-size': '11px'}"
 data-grsf-gdpr-checkbox-style="{'color': '#222222', 'font-size': '11px'}"
 data-grsf-button-style="{'background-color': '#5890E7', 'color': '#fcfcfc', 'font-family': 'Sans', 'font-size': '12px'}"
 data-grsf-link-style="{'color': '#515151'}"
 data-grsf-field-first-name-label="Your First Name"
 data-grsf-field-first-name-placeholder="Your First Name"
 data-grsf-field-first-name-label="Your Last Name"
 data-grsf-field-first-name-placeholder="Your Last Name"
 data-grsf-social-buttons-layout-theme="3"
 data-grsf-email-button-style="{'background-color': '#5890E7', 'color': '#fcfcfc', 'font-family': 'Arial', 'font-size': '12px'}"
 data-grsf-email-button-text="Share"
 data-grsf-email-button-message="I just saved $X,XXX by using this service! {{shareUrl}}"
 data-grsf-email-button-subject="Check this out friend"
 data-grsf-facebook-button-style="{'background-color': '#5890E7', 'font-family': 'Courier New', 'font-size': '12px'}"
 data-grsf-facebook-button-text="Share"
 data-grsf-facebook-button-message="I just saved $X,XXX by using this service! {{shareUrl}}" 
 data-grsf-twitter-button-style="{'background-color': '#5890E7', 'font-family': 'Arial', 'font-size': '12px'}"
 data-grsf-twitter-button-text="Share"
 data-grsf-twitter-button-message="I just saved $X,XXX by using this service! {{shareUrl}}"
 data-grsf-share-instructions="Share this unique link with your friends"
 data-grsf-share-instructions-style="{'padding': '10px'}"
 data-grsf-share-url-input-style="{'border': '1px solid gray'}"
 data-grsf-copy-link-button-layout-theme="3"
 data-grsf-copy-link-button-text="Copy Link"
 data-grsf-copy-link-button-style="{'color': '#fff', 'background': '#000' }"
 data-grsf-copy-link-container-style="{'padding': '10px'}"
 data-grsf-redirect-url="https://replaceme.com">
</div>
```

{% endtab %}
{% endtabs %}

**Data attributes:**

| HTML Attribute                                | Data Type | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`data-grsf-block-form`**                    | N/A       | (Required) This attribute turns any HTML element into an embedded form.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **`data-grsf-email`**                         | String    | (Optional) If provided with a valid email address, a new participant will be created, or an existing participant will be returned — and their unique referral link and social share buttons will be displayed.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **`data-grsf-first-name`**                    | String    | <p>(Optional) If provided with <code>data-grsf-email</code>, then this value will be saved as the new participant's first name property.</p><p></p><p>If the participant already exists in the referral campaign, then this attribute will be ignored.</p>                                                                                                                                                                                                                                                                                                                                                                                                  |
| **`data-grsf-last-name`**                     | String    | <p>(Optional) If provided with <code>data-grsf-email</code>, then this value will be saved as the new participant's last name property.</p><p></p><p>If the participant already exists in the referral campaign, then this attribute will be ignored.</p>                                                                                                                                                                                                                                                                                                                                                                                                   |
| **`data-grsf-metadata`**                      | Object    | <p>(Optional) If provided with <code>data-grsf-email</code>, then this value will be saved as the new participant's <a href="../rest-api/api-guidelines#metadata">metadata</a>.</p><p></p><p>If the participant already exists in the referral campaign, then this attribute will be ignored.</p>                                                                                                                                                                                                                                                                                                                                                           |
| **`data-grsf-gdpr-paragraph-style`**          | Object    | (Optional) Adds inline styles to the GDPR consent paragraph text (if GDPR enabled).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **`data-grsf-gdpr-checkbox-style`**           | Object    | (Optional) Adds inline styles to the GDPR consent checkbox text (if GDPR is enabled).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **`data-grsf-label-style`**                   | Object    | (Optional) Adds inline styles to the form input labels.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **`data-grsf-button-style`**                  | Object    | (Optional) Adds inline styles to any button elements.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **`data-grsf-link-style`**                    | Object    | (Optional) Adds custom styles to any link elements.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **`data-grsf-social-buttons-layout-theme`**   | Number    | <p>(Optional) Set the theme of the social buttons. Choose from the following options:<br><br><code>1</code> - Color buttons with text<br><code>2</code> - Gray buttons with text<br><code>3</code> - Color icons<br><code>4</code> - Gray icons<br><br>Example: <code>data-grsf-social-buttons-layout-theme="2"</code>.</p>                                                                                                                                                                                                                                                                                                                                 |
| **`data-grsf-field-*-label`**                 | String    | <p>(Optional) Sets the label text for the targeted input field.</p><p></p><p>Replace <code>\*</code> with one of the following options: <code>email</code>,  <code>first-name</code>, <code>last-name</code>, <code>custom-field</code>.</p><p><br><strong>Example:</strong> <code>data-grsf-field-first-name-label</code>.</p><p><br>Custom fields are supported, so if you have an input field called "Phone Number", you would set <code>data-grsf-field-phone-number-label</code> (make sure to follow <a href="https://en.wikipedia.org/wiki/Letter_case#Kebab_case">kebab-case</a>).</p>                                                              |
| **`data-grsf-field-*-placeholder`**           | String    | <p>(Optional) Sets the placeholder text for the targeted input field.</p><p></p><p>Replace <code>\*</code> with one of the following options: <code>email</code>,  <code>first-name</code>, <code>last-name</code>, <code>custom-field</code>.</p><p><br><strong>Example:</strong> <code>data-grsf-field-first-name-placeholder</code>.</p><p><br>Custom fields are supported, so if you have an input field called "Phone Number", you would set <code>data-grsf-field-phone-number-placeholder</code> (make sure to follow <a href="https://en.wikipedia.org/wiki/Letter_case#Special_case_styles">kebab-case</a>).</p>                                   |
| **`data-grsf-*-button-style`**                | Object    | <p>(Optional) Adds inline styles to the targeted social share button.</p><p></p><p>Replace <code>\*</code> with one of the following options: <code>email</code>, <code>facebook</code>, <code>twitter</code>, <code>threads</code>, <code>bluesky</code>, <code>pinterest</code>, <code>linkedin</code>, <code>sms</code>, <code>messenger</code>, <code>whatsapp</code>, <code>wechat</code>, <code>telegram</code>, <code>reddit</code>, <code>tumblr</code>, <code>qrcode</code>.</p><p></p><p><strong>Example:</strong> <code>data-grsf-facebook-button-style</code>.</p>                                                                              |
| **`data-grsf-*-button-text`**                 | String    | <p>(Optional) Sets the text of the targeted social share button.</p><p></p><p>Replace <code>\*</code> with one of the following options: <code>email</code>, <code>facebook</code>, <code>twitter</code>, <code>threads</code>, <code>bluesky</code>, <code>pinterest</code>, <code>linkedin</code>, <code>sms</code>, <code>messenger</code>, <code>whatsapp</code>, <code>wechat</code>, <code>telegram</code>, <code>reddit</code>, <code>tumblr</code>, <code>qrcode</code>.</p><p></p><p><strong>Example:</strong> <code>data-grsf-facebook-button-text</code>.</p>                                                                                    |
| **`data-grsf-*-button-message`**              | String    | <p>(Optional) Sets the pre-populated message of the targeted social share button.<br><br>Replace <code>\*</code> with one of the following options: <code>email</code>, <code>facebook</code>, <code>twitter</code>, <code>pinterest</code>, <code>sms</code>, <code>whatsapp</code>, <code>reddit</code>, <code>tumblr</code>.</p><p><br><strong>Example:</strong> <code>data-grsf-facebook-button-message</code>.<br><br>Include <code>{{shareUrl}}</code> to dynamically set the participant's Share URL within the pre-populated message.<br></p><p>To change the subject line for email messages, set <code>data-grsf-email-button-subject</code>.</p> |
| **`data-grsf-share-instructions`**            | String    | (Optional) Sets the text of the share instructions (these instructions are only visible when the participant is in the auth state).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **`data-grsf-share-instructions-style`**      | Object    | (Optional) Adds inline styles to the share instructions.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **`data-grsf-share-url-input-style`**         | Object    | (Optional) Adds inline styles to the Share URL input field.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **`data-grsf-copy-link-button-layout-theme`** | Number    | <p>(Optional) Set the theme of the "Copy Link" button. Choose from the following options:<br><br><code>1</code> - Text button<br><code>2</code> - Icon style #1<br><code>3</code> - Icon style #2<br><code>4</code> - Icon style #3<br><br><strong>Example</strong>: <code>data-grsf-copy-link-button-layout-theme="3"</code>.</p>                                                                                                                                                                                                                                                                                                                          |
| **`data-grsf-copy-link-button-text`**         | String    | (Optional) Sets the text of the 'Copy Link' button.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **`data-grsf-copy-link-button-style`**        | Object    | (Optional) Adds inline styles to the 'Copy Link' button.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **`data-grsf-copy-link-container`**           | Object    | (Optional) Adds inline styles to the container of the input box and Copy Link button.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **`data-grsf-redirect-url`**                  | String    | (Optional) Redirects to the given URL upon form submission                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

***

## **Embedded Invite**

The embedded invite is an element that lets a participant send a bulk email invite out to a list of email addresses. It will only be displayed to signed-in participants.

<figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2FCseQIbKJOgLjUFjFALUS%2FEmbedded%20Invite.png?alt=media&#x26;token=d0adedef-330a-4098-bc70-a6467ad11d0d" alt=""><figcaption><p>Only participants who are signed in will see the embedded invite</p></figcaption></figure>

**Example usage:**

{% tabs %}
{% tab title="Basic" %}
This is the bare minimum code required to display this element.

```html
<div data-grsf-block-invite></div>
```

{% endtab %}

{% tab title="With auth" %}
If you have users logged into your website or web app, you can pass their email address in so that they always see the element in the participant ("auth") view.

{% hint style="info" %}
**Note:** If you are already setting `data-grsf-email`, `data-grsf-first-name`, or `data-grsf-last-name` on another GrowSurf embedded element, then you do not need to set them here.
{% endhint %}

```html
<!-- Make sure to replace "gavin@hooli.com", "Gavin", and "Belson" with your logged-in user's email address, first name, and last name, respectively. -->
<div data-grsf-block-invite
 data-grsf-email="gavin@hooli.com"
 data-grsf-first-name="Gavin"
 data-grsf-last-name="Belson"></div>
```

### Here is an equivalent JavaScript implementation:

Here's what you would have in your HTML file:

```html
<div data-grsf-block-invite></div>
```

And here's what you would have in your JavaScript (make sure to use the [`grsfReady`](https://docs.growsurf.com/developer-tools/javascript-sdk#grsfready-event-listener) event listener anytime you call any `growsurf` functions):

```javascript
// Make sure to replace "gavin@hooli.com", "Gavin", and "Belson" with your logged-in user's email address, first name, and last name, respectively.
growsurf.addParticipant({
  email: "gavin@hooli.com",
  firstName: "Gavin",
  lastName: "Belson"
});
```

{% endtab %}

{% tab title="100% customized" %}
This is an example that contains all of the available data attributes that can be customized.

{% hint style="info" %}
**Note:** If you are already setting `data-grsf-email`, `data-grsf-first-name`, or `data-grsf-last-name` on another GrowSurf embedded element, then you do not need to set them here.
{% endhint %}

```html
<!-- Make sure to replace "gavin@hooli.com", "Gavin", and "Belson" with your logged-in user's email address, first name, and last name, respectively. -->
<div data-grsf-block-invite
 data-grsf-email="gavin@hooli.com"
 data-grsf-first-name="Gavin"
 data-grsf-last-name="Belson" 
 data-grsf-instructions-text="Invite your friends/family!"
 data-grsf-instructions-style="{'text-align': 'left'}"
 data-grsf-label-style="{'font-weight': 'bold'}"
 data-grsf-input-style="{'border': '1px solid #D3D3D3'}"
 data-grsf-input-placeholder-text="Enter email addresses here"
 data-grsf-preview-link-text="Preview your message"
 data-grsf-preview-subject-label="Email Subject"
 data-grsf-preview-subject-placeholder="Check this out"
 data-grsf-preview-subject="Check this out"
 data-grsf-preview-subject-style="{'border': '1px solid #D3D3D3'}"
 data-grsf-preview-message-label="Email Message"
 data-grsf-preview-message-placeholder="I just saved $X,XXX by using this service! {{shareUrl}}"
 data-grsf-preview-message="I just saved $X,XXX by using this service! {{shareUrl}}"
 data-grsf-preview-message-style="{'border': '1px solid #D3D3D3'}"
 data-grsf-link-style="{'color': '#8885E1'}"
 data-grsf-submit-button-text="Send Invite To Friends"
 data-grsf-button-style="{'background-color': '#5890E7', 'text-transform': 'initial', 'font-family': 'Arial', 'color': '#FFFFFF', 'border-radius': '6px' }"
 data-grsf-contact-pill-style="{'background-color': '#8885E1', 'color': '#fff'}"
 data-grsf-google-button-style="{'background-color': '#5890E7', 'font-size': '8px', 'border-radius': '0', 'min-width': '320px', 'font-weight': '100'}"
 data-grsf-google-button-text="Import from Google"
 data-grsf-contact-picker-search-text="Search for contacts"
 data-grsf-contact-picker-suggestions-text="Here are some suggestions"
 data-grsf-contact-picker-results-text="Your search results"
 data-grsf-contact-picker-load-more-button-text="Load More Contacts">
</div>
```

{% endtab %}
{% endtabs %}

**Data attributes:**

| HTML Attribute                                       | Data Type | Description                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`data-grsf-block-invite`**                         | N/A       | (Required) This attribute turns any HTML element into an embedded invite.                                                                                                                                                                                                                                                                                            |
| **`data-grsf-email`**                                | String    | (Optional) The email of the participant to display the invite element for. If the participant does not yet exist within the campaign, they will be newly added.                                                                                                                                                                                                      |
| **`data-grsf-instructions-text`**                    | String    | (Optional) Sets the text of the invite instructions.                                                                                                                                                                                                                                                                                                                 |
| **`data-grsf-instructions-style`**                   | Object    | (Optional) Adds inline styles to the invite instructions.                                                                                                                                                                                                                                                                                                            |
| **`data-grsf-label-style`**                          | Object    | (Optional) Adds inline styles to the form input labels.                                                                                                                                                                                                                                                                                                              |
| **`data-grsf-input-style`**                          | Object    | (Optional) Adds inline styles to the email address input field.                                                                                                                                                                                                                                                                                                      |
| **`data-grsf-input-placeholder-text`**               | String    | (Optional) Sets the placeholder text of the email address input field.                                                                                                                                                                                                                                                                                               |
| **`data-grsf-preview-link-text`**                    | String    | (Optional) Sets the text of the preview link. If no value is provided, the button text will default to the GrowSurf window invite preview link text.                                                                                                                                                                                                                 |
| **`data-grsf-preview-subject-label`**                | String    | (Optional) Sets the label text for the email subject line in the preview section.                                                                                                                                                                                                                                                                                    |
| **`data-grsf-preview-subject-placeholder`**          | String    | (Optional) Sets the placeholder text for the email subject line in the preview section.                                                                                                                                                                                                                                                                              |
| **`data-grsf-preview-subject`**                      | String    | (Optional) Sets the pre-populated value for the email subject line in the preview section.                                                                                                                                                                                                                                                                           |
| **`data-grsf-preview-subject-style`**                | Object    | (Optional) Adds inline styles to the preview subject input field.                                                                                                                                                                                                                                                                                                    |
| **`data-grsf-preview-message-label`**                | String    | (Optional) Sets the label text for the email message body in the preview section.                                                                                                                                                                                                                                                                                    |
| **`data-grsf-preview-message-placeholder`**          | String    | (Optional) Sets the placeholder text for the email message body in the preview section.                                                                                                                                                                                                                                                                              |
| **`data-grsf-preview-message`**                      | String    | <p>(Optional) Sets the pre-populated value for the email message body in the preview section.</p><p></p><p>Include <code>{{shareUrl}}</code> to dynamically set the participant's Share URL within the pre-populated message.</p>                                                                                                                                    |
| **`data-grsf-preview-message-style`**                | Object    | (Optional) Adds inline styles to the preview message input field.                                                                                                                                                                                                                                                                                                    |
| **`data-grsf-link-style`**                           | Object    | (Optional) Adds inline styles to any link elements. If no value is provided, the link styles will inherit from the GrowSurf window link styles.                                                                                                                                                                                                                      |
| **`data-grsf-submit-button-text`**                   | String    | (Optional) Sets the text of the submit button. If no value is provided, the button text will default to the GrowSurf window invite submit button text.                                                                                                                                                                                                               |
| **`data-grsf-button-style`**                         | Object    | (Optional) Adds inline styles to any button elements. If no value is provided, the button styles will inherit from the GrowSurf window button styles.                                                                                                                                                                                                                |
| **`data-grsf-contact-pill-style`**                   | Object    | (Optional) Adds custom styles to the contact pills, which appear underneath the email address input field when email addresses have been entered. If no value is provided, the button styles will inherit from the GrowSurf window contact pill styles.                                                                                                              |
| **`data-grsf-*-button-style`**                       | Object    | <p>(Optional) Adds inline styles to the targeted address book button. If no value is provided, the button styles will inherit from the GrowSurf window button styles.</p><p></p><p>Replace <code>\*</code> with one of the following options: <code>google</code>.</p><p></p><p><strong>Example:</strong> <code>data-grsf-google-button-style</code>.</p>            |
| **`data-grsf-*-button-text`**                        | String    | <p>(Optional) Sets the text of the targeted address book button. If no value is provided, the button text will default to the GrowSurf window invite Google Contacts button text.</p><p></p><p>Replace <code>\*</code> with one of the following options: <code>google</code>.</p><p></p><p><strong>Example:</strong> <code>data-grsf-google-button-text</code>.</p> |
| **`data-grsf-contact-picker-search-text`**           | String    | (Optional) Sets the "Search" text in the contact picker.                                                                                                                                                                                                                                                                                                             |
| **`data-grsf-contact-picker-suggestions-text`**      | String    | (Optional) Sets the "Suggestions" text in the contact picker.                                                                                                                                                                                                                                                                                                        |
| **`data-grsf-contact-picker-results-text`**          | String    | (Optional) Sets the "Results" text in the contact picker.                                                                                                                                                                                                                                                                                                            |
| **`data-grsf-contact-picker-load-more-button-text`** | String    | (Optional) Sets the "Load More" button text in the contact picker.                                                                                                                                                                                                                                                                                                   |

***

## Embedded Rewards

<mark style="color:orange;">Referral programs only</mark>

The embedded rewards will display the participant's earned rewards. If the participant's rewards are not approved yet or if they have not yet unlocked any rewards, they will see an empty state. This element will only be displayed to signed-in participants.

<figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2FGRFrB2BcnXXY4wjEfg64%2FEmbedded%20Rewards.png?alt=media&#x26;token=ada9837e-addf-493a-803c-77ae0a584e37" alt=""><figcaption><p>Only participants who are signed in will see the embedded rewards.</p></figcaption></figure>

**Example usage:**

{% tabs %}
{% tab title="Basic" %}
This is the bare minimum code required to display this element.

```html
<div data-grsf-block-rewards></div>
```

{% endtab %}

{% tab title="With auth" %}
If you have users logged into your website or web app, you can pass their email address in so that they always see the element in the participant ("auth") view.

{% hint style="info" %}
**Note:** If you are already setting `data-grsf-email`, `data-grsf-first-name`, or `data-grsf-last-name` on another GrowSurf embedded element, then you do not need to set them here.
{% endhint %}

```html
<!-- Make sure to replace "gavin@hooli.com", "Gavin", and "Belson" with your logged-in user's email address, first name, and last name, respectively. -->
<div data-grsf-block-rewards
 data-grsf-email="gavin@hooli.com"
 data-grsf-first-name="Gavin"
 data-grsf-last-name="Belson"></div>
```

### Here is an equivalent JavaScript implementation:

Here's what you would have in your HTML file:

```html
<div data-grsf-block-rewards></div>
```

And here's what you would have in your JavaScript (make sure to use the [`grsfReady`](https://docs.growsurf.com/developer-tools/javascript-sdk#grsfready-event-listener) event listener anytime you call any `growsurf` functions):

```javascript
// Make sure to replace "gavin@hooli.com", "Gavin", and "Belson" with your logged-in user's email address, first name, and last name, respectively.
growsurf.addParticipant({
  email: "gavin@hooli.com",
  firstName: "Gavin",
  lastName: "Belson"
});
```

{% endtab %}

{% tab title="100% customized" %}
This is an example that contains all of the available data attributes that can be customized.

{% hint style="info" %}
**Note:** If you are already setting `data-grsf-email`, `data-grsf-first-name`, or `data-grsf-last-name` on another GrowSurf embedded element, then you do not need to set them here.
{% endhint %}

```html
<!-- Make sure to replace "gavin@hooli.com", "Gavin", and "Belson" with your logged-in user's email address, first name, and last name, respectively. -->
<div data-grsf-block-rewards 
 data-grsf-email="gavin@hooli.com"
 data-grsf-first-name="Gavin"
 data-grsf-last-name="Belson"
 data-grsf-card-style="{'background-color': '#FDFDFD', 'box-shadow': 'none', 'border-radius': '12px', 'padding': '10px'}"
 data-grsf-title-style="{'font-size': '16px'}"
 data-grsf-horizontal="true"
 data-grsf-horizontal-scroll="true"
 data-grsf-required-referrals-text="Req Refs"
 data-grsf-required-referrals-style="{'background-color': '#117a8b', 'color': '#CCCCCC'}"
 data-grsf-top-referrers-text="Top ambassadors"
 data-grsf-top-referrers-style="{'background-color': '#5890E7', 'color': '#FFFFFF'}"
 data-grsf-reward-limit-text="per winner"
 data-grsf-reward-monthly-limit-text="per sunny month"
 data-grsf-reward-limit-style="{'color': 'black'}" 
 data-grsf-progress-icon-style="{'background-color': '#d39e00', 'color': '#000000'}"
 data-grsf-max-progress-icons="6"
 data-grsf-footer-style="{'text-align': 'center', 'color': '#E7B558'}">
</div>
```

{% endtab %}
{% endtabs %}

**Data attributes:**

| HTML Attribute                            | Data Type | Description                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`data-grsf-block-rewards`**             | N/A       | (Required) This attribute turns any HTML element into embedded rewards.                                                                                                                                                                                                                                                                 |
| **`data-grsf-email`**                     | String    | (Optional) The email of the participant to display the rewards element for. If the participant does not yet exist within the campaign, they will be newly added.                                                                                                                                                                        |
| **`data-grsf-card-style`**                | Object    | (Optional) Adds custom styles to the reward card(s).                                                                                                                                                                                                                                                                                    |
| **`data-grsf-title-style`**               | Object    | (Optional) Adds custom styles to the reward title.                                                                                                                                                                                                                                                                                      |
| **`data-grsf-horizontal`**                | Boolean   | (Optional) Displays the rewards in a horizontal format.                                                                                                                                                                                                                                                                                 |
| **`data-grsf-horizontal-scroll`**         | Boolean   | (Optional) If `data-grsf-horizontal` is set to `true`, this property will display rewards in a single scrollable row.                                                                                                                                                                                                                   |
| **`data-grsf-required-referrals-text`**   | String    | <p>(Optional) Sets the "required referrals" text. This is the text that is used to indicate the number of referrals a participant must make in order to earn the reward.</p><p></p><p><strong>NOTE</strong> </p><p>This element only displays for non-Leaderboard reward types.</p>                                                     |
| **`data-grsf-required-referrals-style`**  | Object    | (Optional) Adds custom inline styling to the "required referrals" tag displayed for non Leaderboard reward types. This is the element within the reward that is used to indicate the number of referrals a participant must make in order to earn the reward.                                                                           |
| **`data-grsf-top-referrers-text`**        | String    | <p>(Optional) Updates the "top referrers" text displayed for Leaderboard reward types. This is the text that is used to indicate the reward goal for Leaderboard type rewards.</p><p></p><p><strong>NOTE</strong></p><p>This element only displays for Leaderboard reward types</p>                                                     |
| **`data-grsf-top-referrers-style`**       | Object    | (Optional) Adds custom styling to the "top referrers" tag. This is the element within the Leaderboard reward that is used to indicate the rank threshold the participant must reach in order to earn the reward.                                                                                                                        |
| **`data-grsf-reward-limit-text`**         | String    | (Optional) Updates the "max per referrer" text displayed within the reward.                                                                                                                                                                                                                                                             |
| **`data-grsf-reward-monthly-limit-text`** | String    | (Optional) Updates the "per month" text displayed within the reward.                                                                                                                                                                                                                                                                    |
| **`data-grsf-reward-limit-style`**        | String    | (Optional) Adds inline styling for the "max per referrer" text and/or "per month" text displayed within the reward.                                                                                                                                                                                                                     |
| **`data-grsf-progress-icon-style`**       | Object    | <p>(Optional) Updates the inline styling of the progress icon style used to display the progress the participant has made in order to achieve the reward goal.</p><p></p><p><strong>NOTE</strong></p><p>Only <code>background-color</code> , <code>color</code>, and <code>display</code> style properties are currently supported.</p> |
| **`data-grsf-max-progress-icons`**        | Number    | (Optional) Updates the max number of progress icons to display.                                                                                                                                                                                                                                                                         |
| **`data-grsf-footer-style`**              | String    | (Optional) Adds inline styles to the footer text messages (e.g, "manual approval" footer tex&#x74;*,* "max rewards shown" footer text).                                                                                                                                                                                                 |

***

## Embedded Referral Status

The embedded referral status will display the progress of the participant's referrals. If no one has signed up yet using the participant's unique referral link or if the participant hasn't sent out any email invites, they will see an empty state. This element will only be displayed to signed-in participants.

For email invitees, if they have not yet signed up, their email address will display as obfuscated

<figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2Fh3QcGwgMmlpEOZTP3W6d%2FEmbedded%20Referral%20Status.png?alt=media&#x26;token=e8e6abd3-3f41-45ab-9fa8-d9d2e89867d9" alt=""><figcaption><p>Only participants who are signed in will see the embedded referral status.</p></figcaption></figure>

**Example usage:**

{% tabs %}
{% tab title="Basic" %}
This is the bare minimum code required to display this element.

```html
<div data-grsf-block-referral-status></div>
```

{% endtab %}

{% tab title="With auth" %}
If you have users logged into your website or web app, you can pass their email address in so that they always see their unique referral link instead of a signup form.

{% hint style="info" %}
**Note:** If you are already setting `data-grsf-email`, `data-grsf-first-name`, or `data-grsf-last-name` on another GrowSurf embedded element, then you do not need to set them here.
{% endhint %}

```html
<!-- Make sure to replace "gavin@hooli.com", "Gavin", and "Belson" with your logged-in user's email address, first name, and last name, respectively. -->
<div data-grsf-block-referral-status
 data-grsf-email="gavin@hooli.com"
 data-grsf-first-name="Gavin"
 data-grsf-last-name="Belson"></div>
```

### Here is an equivalent JavaScript implementation:

Here's what you would have in your HTML file:

```html
<div data-grsf-block-referral-status></div>
```

And here's what you would have in your JavaScript (make sure to use the [`grsfReady`](https://docs.growsurf.com/developer-tools/javascript-sdk#grsfready-event-listener) event listener anytime you call any `growsurf` functions):

```javascript
// Make sure to replace "gavin@hooli.com", "Gavin", and "Belson" with your logged-in user's email address, first name, and last name, respectively.
growsurf.addParticipant({
  email: "gavin@hooli.com",
  firstName: "Gavin",
  lastName: "Belson"
});
```

{% endtab %}

{% tab title="100% customized" %}
This is an example that contains all of the available data properties that can be customized.

{% hint style="info" %}
**Note:** If you are already setting `data-grsf-email`, `data-grsf-first-name`, or `data-grsf-last-name` on another GrowSurf embedded element, then you do not need to set them here.
{% endhint %}

```html
<!-- Make sure to replace "gavin@hooli.com", "Gavin", and "Belson" with your logged-in user's email address, first name, and last name, respectively. -->
<div data-grsf-block-referral-status 
 data-grsf-email="gavin@hooli.com"
 data-grsf-first-name="Gavin"
 data-grsf-last-name="Belson"
 data-grsf-referral-status-title="Referral Status"
 data-grsf-referral-status-title-style="{'font-weight': '100', 'font-size': '36px'}"
 data-grsf-your-referral-column-text="Your Friend"
 data-grsf-status-column-text="Their Status"
 data-grsf-button-style="{'background-color': '#5890E7', 'color': '#fcfcfc', 'font-size': '12px', 'border-radius': '100%'}"
 data-grsf-header-style="{'display':'none'}"
 data-grsf-list-item-style="{'border-radius': '0', 'padding': '0', 'box-shadow': 'none', 'align-items': 'flex-start'}"
 data-grsf-link-style="{'background-color': '#8885E1', 'color': '#fff'}">
</div>
```

{% endtab %}
{% endtabs %}

**Data attributes:**

| HTML Attribute                              | Data Type | Description                                                                                                                                                              |
| ------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`data-grsf-block-referral-status`**       | N/A       | (Required) This attribute turns any HTML element into an embedded referral status element.                                                                               |
| **`data-grsf-email`**                       | String    | (Optional) The email of the participant to display the referral status element for. If the participant does not yet exist within the campaign, they will be newly added. |
| **`data-grsf-button-style`**                | Object    | (Optional) Adds inline styles to any buttons within the referral status element.                                                                                         |
| **`data-grsf-link-style`**                  | Object    | (Optional) Adds custom styles to any link elements within the embedded referral status element.                                                                          |
| **`data-grsf-referral-status-title`**       | String    | (Optional) Sets the text of the title above the referral status list.                                                                                                    |
| **`data-grsf-referral-status-title-style`** | Object    | (Optional) Adds inline styles to the text of the title above the referral status list.                                                                                   |
| **`data-grsf-status-column-text`**          | String    | (Optional) Sets the text of the *Status* column header.                                                                                                                  |
| **`data-grsf-your-referral-column-text`**   | String    | (Optional) Sets the text of the *Your Referral* column header.                                                                                                           |
| **`data-grsf-header-style`**                | Object    | (Optional) Adds inline styles to the header that is displayed above the referrals list.                                                                                  |
| **`data-grsf-list-item-style`**             | Object    | (Optional) Adds inline styles to the list items that are displayed within the referrals list.                                                                            |

***

## Embedded Affiliate Summary

<mark style="color:orange;">Affiliate programs only</mark>

The embedded affiliate summary will display the participant's relevant affiliate program stats. This element will only be displayed to signed-in participants.

<figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2FngdEsr7GRgJ2kXSiL9nh%2FEmbedded%20Affiliate%20Summary.png?alt=media&#x26;token=5579bbcf-d628-46ca-aaea-43fba7c7e0e1" alt=""><figcaption><p>Only participants who are signed in will see the embedded affiliate summary.</p></figcaption></figure>

**Example usage:**

{% tabs %}
{% tab title="Basic" %}
This is the bare minimum code required to display this element.

```html
<div data-grsf-block-affiliate-summary></div>
```

{% endtab %}

{% tab title="With auth" %}
If you have users logged into your website or web app, you can pass their email address in so that they always see the element in the participant ("auth") view.

{% hint style="info" %}
**Note:** If you are already setting `data-grsf-email`, `data-grsf-first-name`, or `data-grsf-last-name` on another GrowSurf embedded element, then you do not need to set them here.
{% endhint %}

```html
<!-- Make sure to replace "gavin@hooli.com", "Gavin", and "Belson" with your logged-in user's email address, first name, and last name, respectively. -->
<div data-grsf-block-affiliate-summary
 data-grsf-email="gavin@hooli.com"
 data-grsf-first-name="Gavin"
 data-grsf-last-name="Belson"></div>
```

### Here is an equivalent JavaScript implementation:

Here's what you would have in your HTML file:

```html
<div data-grsf-block-rewards></div>
```

And here's what you would have in your JavaScript (make sure to use the [`grsfReady`](https://docs.growsurf.com/developer-tools/javascript-sdk#grsfready-event-listener) event listener anytime you call any `growsurf` functions):

```javascript
// Make sure to replace "gavin@hooli.com", "Gavin", and "Belson" with your logged-in user's email address, first name, and last name, respectively.
growsurf.addParticipant({
  email: "gavin@hooli.com",
  firstName: "Gavin",
  lastName: "Belson"
});
```

{% endtab %}

{% tab title="100% customized" %}
This is an example that contains all of the available data attributes that can be customized.

{% hint style="info" %}
**Note:** If you are already setting `data-grsf-email`, `data-grsf-first-name`, or `data-grsf-last-name` on another GrowSurf embedded element, then you do not need to set them here.
{% endhint %}

```html
<!-- Make sure to replace "gavin@hooli.com", "Gavin", and "Belson" with your logged-in user's email address, first name, and last name, respectively. -->
<div data-grsf-block-affiliate-summary 
 data-grsf-email="gavin@hooli.com"
 data-grsf-first-name="Gavin"
 data-grsf-last-name="Belson"
 data-grsf-affiliate-summary-title="Your Summary"
 data-grsf-affiliate-summary-title-style="{'font-size': '16px'}">
</div>
```

{% endtab %}
{% endtabs %}

**Data attributes:**

| HTML Attribute                                | Data Type | Description                                                                                                                                                                |
| --------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`data-grsf-block-affiliate-summary`**       | N/A       | (Required) This attribute turns any HTML element into embedded affiliate summary.                                                                                          |
| **`data-grsf-email`**                         | String    | (Optional) The email of the participant to display the affiliate summary element for. If the participant does not yet exist within the campaign, they will be newly added. |
| **`data-grsf-affiliate-summary-title`**       | String    | (Optional) Sets the text of the title above the affiliate summary.                                                                                                         |
| **`data-grsf-affiliate-summary-title-style`** | Object    | (Optional) Adds custom styles to the title.                                                                                                                                |

***

## Embedded Commissions

<mark style="color:orange;">Affiliate programs only</mark>

The embedded commissions will display the participant's list of commissions. This element will only be displayed to signed-in participants.

<figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2FtNCuiiw2Ipk50NREMtos%2FEmbedded%20Commissions.png?alt=media&#x26;token=2840b8a4-5d55-4274-9836-b31bcb066e51" alt=""><figcaption><p>Only participants who are signed in will see the embedded commissions.</p></figcaption></figure>

**Example usage:**

{% tabs %}
{% tab title="Basic" %}
This is the bare minimum code required to display this element.

```html
<div data-grsf-block-commissions></div>
```

{% endtab %}

{% tab title="With auth" %}
If you have users logged into your website or web app, you can pass their email address in so that they always see the element in the participant ("auth") view.

{% hint style="info" %}
**Note:** If you are already setting `data-grsf-email`, `data-grsf-first-name`, or `data-grsf-last-name` on another GrowSurf embedded element, then you do not need to set them here.
{% endhint %}

```html
<!-- Make sure to replace "gavin@hooli.com", "Gavin", and "Belson" with your logged-in user's email address, first name, and last name, respectively. -->
<div data-grsf-block-commissions
 data-grsf-email="gavin@hooli.com"
 data-grsf-first-name="Gavin"
 data-grsf-last-name="Belson"></div>
```

### Here is an equivalent JavaScript implementation:

Here's what you would have in your HTML file:

```html
<div data-grsf-block-rewards></div>
```

And here's what you would have in your JavaScript (make sure to use the [`grsfReady`](https://docs.growsurf.com/developer-tools/javascript-sdk#grsfready-event-listener) event listener anytime you call any `growsurf` functions):

```javascript
// Make sure to replace "gavin@hooli.com", "Gavin", and "Belson" with your logged-in user's email address, first name, and last name, respectively.
growsurf.addParticipant({
  email: "gavin@hooli.com",
  firstName: "Gavin",
  lastName: "Belson"
});
```

{% endtab %}

{% tab title="100% customized" %}
This is an example that contains all of the available data attributes that can be customized.

{% hint style="info" %}
**Note:** If you are already setting `data-grsf-email`, `data-grsf-first-name`, or `data-grsf-last-name` on another GrowSurf embedded element, then you do not need to set them here.
{% endhint %}

```html
<!-- Make sure to replace "gavin@hooli.com", "Gavin", and "Belson" with your logged-in user's email address, first name, and last name, respectively. -->
<div data-grsf-block-commissions 
 data-grsf-email="gavin@hooli.com"
 data-grsf-first-name="Gavin"
 data-grsf-last-name="Belson"
 data-grsf-commissions-title="Your Commissions"
 data-grsf-commissions-title-style="{'font-size': '16px'}"
 data-grsf-commissions-commission-column-text="Your Commission"
 data-grsf-commissions-status-column-text="Your Status"
 data-grsf-button-style="{'background-color': 'red', 'font-family': 'Sans'}"
 data-grsf-header-style="{'display':'none'}"
 data-grsf-list-item-style="{'border-radius': '0', 'padding': '0', 'box-shadow': 'none', 'align-items': 'flex-start'}>
</div>
```

{% endtab %}
{% endtabs %}

**Data attributes:**

| HTML Attribute                                     | Data Type | Description                                                                                                                                                          |
| -------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`data-grsf-block-commissions`**                  | N/A       | (Required) This attribute turns any HTML element into embedded commissions.                                                                                          |
| **`data-grsf-email`**                              | String    | (Optional) The email of the participant to display the commissions element for. If the participant does not yet exist within the campaign, they will be newly added. |
| **`data-grsf-commissions-title`**                  | String    | (Optional) Sets the text of the title above the commissions.                                                                                                         |
| **`data-grsf-commissions-title-style`**            | Object    | (Optional) Adds custom styles to the title.                                                                                                                          |
| **`data-grsf-commissions-commission-column-text`** | String    | (Optional) Sets the text of the commission column header.                                                                                                            |
| **`data-grsf-commissions-status-column-text`**     | String    | (Optional) Sets the text of the status column header.                                                                                                                |
| **`data-grsf-button-style`**                       | Object    | (Optional) Adds inline styles to the "Load More" button that is displayed if there are more commissions to load.                                                     |
| **`data-grsf-header-style`**                       | Object    | (Optional) Adds inline styles to the header that is displayed above the commissions list.                                                                            |
| **`data-grsf-list-item-style`**                    | Object    | (Optional) Adds inline styles to the list items that are displayed within the commissions list.                                                                      |

***

## Embedded Payouts

<mark style="color:orange;">Affiliate programs only</mark>

The embedded payouts will display the participant's list of payouts. This element will only be displayed to signed-in participants.

<figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2FUtETwnbMQ8dWJPvIpgZH%2FEmbedded%20Payouts.png?alt=media&#x26;token=fb658cf5-fb02-43ff-961b-70d987d5db5b" alt=""><figcaption><p>Only participants who are signed in will see the embedded payouts.</p></figcaption></figure>

**Example usage:**

{% tabs %}
{% tab title="Basic" %}
This is the bare minimum code required to display this element.

```html
<div data-grsf-block-payouts></div>
```

{% endtab %}

{% tab title="With auth" %}
If you have users logged into your website or web app, you can pass their email address in so that they always see the element in the participant ("auth") view.

{% hint style="info" %}
**Note:** If you are already setting `data-grsf-email`, `data-grsf-first-name`, or `data-grsf-last-name` on another GrowSurf embedded element, then you do not need to set them here.
{% endhint %}

```html
<!-- Make sure to replace "gavin@hooli.com", "Gavin", and "Belson" with your logged-in user's email address, first name, and last name, respectively. -->
<div data-grsf-block-payouts
 data-grsf-email="gavin@hooli.com"
 data-grsf-first-name="Gavin"
 data-grsf-last-name="Belson"></div>
```

### Here is an equivalent JavaScript implementation:

Here's what you would have in your HTML file:

```html
<div data-grsf-block-rewards></div>
```

And here's what you would have in your JavaScript (make sure to use the [`grsfReady`](https://docs.growsurf.com/developer-tools/javascript-sdk#grsfready-event-listener) event listener anytime you call any `growsurf` functions):

```javascript
// Make sure to replace "gavin@hooli.com", "Gavin", and "Belson" with your logged-in user's email address, first name, and last name, respectively.
growsurf.addParticipant({
  email: "gavin@hooli.com",
  firstName: "Gavin",
  lastName: "Belson"
});
```

{% endtab %}

{% tab title="100% customized" %}
This is an example that contains all of the available data attributes that can be customized.

{% hint style="info" %}
**Note:** If you are already setting `data-grsf-email`, `data-grsf-first-name`, or `data-grsf-last-name` on another GrowSurf embedded element, then you do not need to set them here.
{% endhint %}

```html
<!-- Make sure to replace "gavin@hooli.com", "Gavin", and "Belson" with your logged-in user's email address, first name, and last name, respectively. -->
<div data-grsf-block-payouts 
 data-grsf-email="gavin@hooli.com"
 data-grsf-first-name="Gavin"
 data-grsf-last-name="Belson"
 data-grsf-payouts-title="Your Payouts"
 data-grsf-payouts-title-style="{'font-size': '16px'}"
 data-grsf-payouts-payout-column-text="Your Payout"
 data-grsf-payouts-status-column-text="Your Status"
 data-grsf-button-style="{'background-color': 'red', 'font-family': 'Sans'}"
 data-grsf-header-style="{'display':'none'}"
 data-grsf-list-item-style="{'border-radius': '0', 'padding': '0', 'box-shadow': 'none', 'align-items': 'flex-start'}>
</div>
```

{% endtab %}
{% endtabs %}

**Data attributes:**

| HTML Attribute                             | Data Type | Description                                                                                                                                                      |
| ------------------------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`data-grsf-block-payouts`**              | N/A       | (Required) This attribute turns any HTML element into embedded payouts.                                                                                          |
| **`data-grsf-email`**                      | String    | (Optional) The email of the participant to display the payouts element for. If the participant does not yet exist within the campaign, they will be newly added. |
| **`data-grsf-payouts-title`**              | String    | (Optional) Sets the text of the title above the payouts.                                                                                                         |
| **`data-grsf-payouts-title-style`**        | Object    | (Optional) Adds custom styles to the title.                                                                                                                      |
| **`data-grsf-payouts-payout-column-text`** | String    | (Optional) Sets the text of the payout column header.                                                                                                            |
| **`data-grsf-payouts-status-column-text`** | String    | (Optional) Sets the text of the status column header.                                                                                                            |
| **`data-grsf-button-style`**               | Object    | (Optional) Adds inline styles to the "Load More" button that is displayed if there are more payouts to load.                                                     |
| **`data-grsf-header-style`**               | Object    | (Optional) Adds inline styles to the header that is displayed above the payouts list.                                                                            |
| **`data-grsf-list-item-style`**            | Object    | (Optional) Adds inline styles to the list items that are displayed within the payouts list.                                                                      |

***

## Embedded Leaderboard

The embedded leaderboard will show a public list of all the participants in ranked order by their number of successful referrals. It will display to both participants and non-participants.

<figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2FDoBcV2mEWMznOFLQDs45%2FEmbedded%20Leaderboard%20(Signed%20Out).png?alt=media&#x26;token=5e32fd8b-7706-4a30-9ad8-d4d95a7ea248" alt=""><figcaption><p>Non-participants will see the public leaderboard</p></figcaption></figure>

<figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2FawFQgoGvU0Ye3s44aP7T%2FEmbedded%20Leaderboard%20(Signed%20In).png?alt=media&#x26;token=7ccdc805-ff2c-4e45-80e6-3685c192f22f" alt=""><figcaption><p>When a participant is signed in, they will see the "You" tag next to them</p></figcaption></figure>

**Example usage:**

{% tabs %}
{% tab title="Basic" %}
This is the bare minimum code required to display this element.

```html
<div data-grsf-block-leaderboard></div>
```

{% endtab %}

{% tab title="With auth" %}
If you have users logged into your website or web app, you can pass their email address in so that they always see the element in the participant ("auth") view.

{% hint style="info" %}
**Note:** If you are already setting `data-grsf-email`, `data-grsf-first-name`, or `data-grsf-last-name` on another GrowSurf embedded element, then you do not need to set them here.
{% endhint %}

```html
<!-- Make sure to replace "gavin@hooli.com", "Gavin", and "Belson" with your logged-in user's email address, first name, and last name, respectively. -->
<div data-grsf-block-leaderboard
 data-grsf-email="gavin@hooli.com"
 data-grsf-first-name="Gavin"
 data-grsf-last-name="Belson"></div>
```

### Here is an equivalent JavaScript implementation:

Here's what you would have in your HTML file:

```html
<div data-grsf-block-leaderboard></div>
```

And here's what you would have in your JavaScript (make sure to use the [`grsfReady`](https://docs.growsurf.com/developer-tools/javascript-sdk#grsfready-event-listener) event listener anytime you call any `growsurf` functions):

```javascript
// Make sure to replace "gavin@hooli.com", "Gavin", and "Belson" with your logged-in user's email address, first name, and last name, respectively.
growsurf.addParticipant({
  email: "gavin@hooli.com",
  firstName: "Gavin",
  lastName: "Belson"
});
```

{% endtab %}

{% tab title="100% customized" %}
This is an example that contains all of the available data attributes that can be customized.

{% hint style="info" %}
**Note:** If you are already setting `data-grsf-email`, `data-grsf-first-name`, or `data-grsf-last-name` on another GrowSurf embedded element, then you do not need to set them here.
{% endhint %}

```html
<!-- Make sure to replace "gavin@hooli.com", "Gavin", and "Belson" with your logged-in user's email address, first name, and last name, respectively. -->
<div data-grsf-block-leaderboard 
 data-grsf-email="gavin@hooli.com"
 data-grsf-first-name="Gavin"
 data-grsf-last-name="Belson"
 data-grsf-button-style="{'background-color': 'red', 'font-family': 'Sans'}"
 data-grsf-link-style="{'background-color': 'red', 'color': '#CCCCCC', 'font-family': 'Courier New'}"
 data-grsf-leaderboard-title="Current Standings"
 data-grsf-leaderboard-title-style="{'font-weight': '100', 'font-size': '36px'}"
 data-grsf-rank-column-text="Position"
 data-grsf-participants-column-text="People"
 data-grsf-referrals-column-text="Count"
 data-grsf-winners-icon-style="{'background-color': 'green', 'color': 'CCCCCC'}"
 data-grsf-header-style="{'display':'none'}"
 data-grsf-list-item-style="{'border-radius': '0', 'padding': '0', 'box-shadow': 'none', 'align-items': 'flex-start'}">
</div>
```

{% endtab %}
{% endtabs %}

**Data attributes:**

| HTML Attribute                           | Data Type | Description                                                                                                                                                          |
| ---------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`data-grsf-block-leaderboard`**        | N/A       | (Required) This attribute turns any HTML element into an embedded leaderboard.                                                                                       |
| **`data-grsf-email`**                    | String    | (Optional) The email of the participant to display the leaderboard element for. If the participant does not yet exist within the campaign, they will be newly added. |
| **`data-grsf-button-style`**             | Object    | (Optional) Adds inline styles to any buttons within the leaderboard.                                                                                                 |
| **`data-grsf-link-style`**               | Object    | (Optional) Adds custom styles to any link elements within the embedded leaderboard.                                                                                  |
| **`data-grsf-leaderboard-title`**        | String    | (Optional) Sets the text of the title above the leaderboard.                                                                                                         |
| **`data-grsf-leaderboard-title-style`**  | Object    | (Optional) Adds inline styles to the text of the title above the leaderboard.                                                                                        |
| **`data-grsf-rank-column-text`**         | String    | (Optional) Sets the text of the rank column header.                                                                                                                  |
| **`data-grsf-participants-column-text`** | String    | (Optional) Sets the text of the participants column header.                                                                                                          |
| **`data-grsf-winners-icon-style`**       | Object    | (Optional) Adds inline styles to the winner icon that is displayed next to the winner.                                                                               |
| **`data-grsf-header-style`**             | Object    | (Optional) Adds inline styles to the header that is displayed above the leaderboard list.                                                                            |
| **`data-grsf-list-item-style`**          | Object    | (Optional) Adds inline styles to the list items that are displayed within the leaderboard list.                                                                      |

***

## Embedded How It Works

The embedded How It Works will display the How It Works section of your referral/affiliate program. This element will be always be displayed regardless of whether a participant is signed in or not.

<figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2FvDpToKC0G7LtFpCO4idW%2Fimage.png?alt=media&#x26;token=fe53f1be-b4c8-4ac5-9bf0-20d43aea092d" alt=""><figcaption><p>The embedded How It Works will display to all participants regardless of whether they are signed in or not</p></figcaption></figure>

**Example usage:**

{% tabs %}
{% tab title="Basic" %}
This is the bare minimum code required to display this element.

```html
<div data-grsf-block-how-it-works></div>
```

{% endtab %}
{% endtabs %}

***

## Embedded FAQ

The embedded FAQ will display the FAQ section of your referral/affiliate program. This element will be always be displayed regardless of whether a participant is signed in or not.

<figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2F71olFEgYjL2gziTLu4pM%2Fimage.png?alt=media&#x26;token=c8b57d3b-d401-4083-9e6d-cc777125c016" alt=""><figcaption><p>The embedded FAQ will display to all participants regardless of whether they are signed in or not</p></figcaption></figure>

**Example usage:**

{% tabs %}
{% tab title="Basic" %}
This is the bare minimum code required to display this element.

```html
<div data-grsf-block-faq></div>
```

{% endtab %}
{% endtabs %}

***

## Embedded Terms

The embedded Terms will display the Terms section of your referral/affiliate program. This element will be always be displayed regardless of whether a participant is signed in or not.

<figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2FNO2DDT5Z1l6qGe8bJpZ6%2Fimage.png?alt=media&#x26;token=77c948cd-ad96-42ff-a82a-2d897a395bcc" alt=""><figcaption><p>The embedded Terms will display to all participants regardless of whether they are signed in or not</p></figcaption></figure>

**Example usage:**

{% tabs %}
{% tab title="Basic" %}
This is the bare minimum code required to display this element.

```html
<div data-grsf-block-terms></div>
```

{% endtab %}
{% endtabs %}
