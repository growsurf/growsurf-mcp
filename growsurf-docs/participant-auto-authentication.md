# Participant Auto Authentication

## **Set up the client**

**Step 1:** Require participants to login/authenticate within the Program Editor

![](https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-legacy-files/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-LzeEKIPaRQ4e6rz142X%2F-LzeGapQc_6sLaaE6Y5y%2FScreen%20Shot%20on%202020-01-27%20at%2021%3A47%3A57.png?alt=media\&token=09c1deaf-edd2-4592-afe0-897ccefbed59)

**Step 2:** Generate a new *Participant Auth Secret*

![](https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-legacy-files/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-LzeEKIPaRQ4e6rz142X%2F-LzeGw_R8zE4F-YNjnl7%2FScreen%20Shot%20on%202020-01-27%20at%2021%3A52%3A35.png?alt=media\&token=b8f6b141-6f02-4769-b1d5-08e4c0a0b832)

**Step 3:** Copy your unique *Participant Auth Secret* (to use for later in the [Setting up the server](#set-up-the-server) instructions).&#x20;

![](https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-legacy-files/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-LzeEKIPaRQ4e6rz142X%2F-LzeH37ZyvFdqSs4xbLO%2FScreen%20Shot%20on%202020-01-27%20at%2021%3A49%3A20.png?alt=media\&token=40df4c94-10b5-4ab5-85d5-6060880a87a2)

{% hint style="info" %}
Your *Participant Auth Secret* holds privileges, so be sure to keep it secure! Do not share your *Participant Auth Secret* in publicly accessible areas such as GitHub, Bitbucket, client code, etc.
{% endhint %}

**Step 4:** Go to the final instructions page within the Program Editor to copy the new GrowSurf Universal Code.

Once your program has a *Participant Auth Secret,* the installation instructions will be updated and you will need to re-install a newly generated [GrowSurf Universal Code](https://docs.growsurf.com/getting-started/..#step-1-install-the-growsurf-universal-code-onto-your-site) snippet.

![](https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-legacy-files/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-LzjOocJWBqzbDvkaxYj%2F-LzjP_6Io515016gWklX%2FScreen%20Shot%20on%202020-01-28%20at%2021%3A48%3A06.png?alt=media\&token=8c3b2f93-97e6-4bb8-bf50-ba8d3b606bca)

This new GrowSurf Universal Code snippet contains a new `window.grsfConfig` Object. Remember to replace two values: (1) set `email`  as the participant's email address, and (2) set `hash` as the value you receive from [setting up the server](#set-up-the-server). See the example code block below:&#x20;

```markup
<script type="text/javascript">
  window.grsfConfig = {
    email: "participant@email.com", // Replace this with the participant's email address
    hash: "HASH_VALUE" // Replace this with the SHA-256 HMAC value
  };

  (function(g,r,s,f){g.growsurf={};g.grsfSettings={campaignId:"k1o87e",version:"2.0.0"};s=r.getElementsByTagName("head")[0];f=r.createElement("script");f.async=1;f.src="http://localhost:3000/static/growsurf.js"+"?v="+g.grsfSettings.version;f.setAttribute("grsf-campaign", g.grsfSettings.campaignId);!g.grsfInit?s.appendChild(f):"";})(window,document);
</script>
```

## Set up the server

On your server, you will need to create a *Hash-based message authentication code* (HMAC).

**Step 1:** Implement SHA-256 HMAC, passing in the following values:

* The *Participant Auth Secret (*&#x66;rom Step 3 of the [Setting up the client](#set-up-the-client) section)
* The participant's email address

Below is an example of the HMAC implementation in Node.js:

{% tabs %}
{% tab title="Node.js" %}

```javascript
require("crypto")
  .createHmac("sha256", "<YOUR_SECRET>")
  .update("participant@email.com")
  .digest("hex");
```

{% endtab %}
{% endtabs %}

## **Testing**

Test your Participant Auto Authentication implementation by going to the URL in which you have installed GrowSurf.

Then load or refresh the page. If successful, you should be authenticated as a participant.

**Below are additional references that may be helpful:**

* JavaScript Web API method [**growsurf.init()**](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#initialize-reinitialize-growsurf)
* [Single Page Applications](https://docs.growsurf.com/integrate/javascript-web-api/single-page-applications)
