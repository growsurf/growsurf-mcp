# API Reference

## &#x20;**Add participant**

Adds a participant to the referral/affiliate program. Use this method for the following use-cases:

* Add referral tracking to your current signup form. If a referral link was used, GrowSurf automatically submits the referrer ID behind the scenes. (We recommend adding only referred participants — view [this tutorial](https://docs.growsurf.com/developer-tools/javascript-sdk/tutorials#example-6-only-add-a-participant-if-they-were-referred) for more info)
* Generate referral links for your signed-in users on the fly (or return existing data if they are an existing participant)

{% hint style="info" %}
**Tips:** Though they are optional, we recommend passing in the fields `firstName` and `lastName` . These fields are used for anti-fraud purposes and they show up in referred friend motivator elements, if enabled. Behind the scenes, this method also passes in other properties like IP address and fingerprint, which will also be used for anti-fraud purposes.
{% endhint %}

{% hint style="warning" %}
**Note:** A `401` error will be returned if the following conditions are met: (1) the program has participant authentication enabled, (2) there is no authentication cookie present on the participant's browser, (3) the given email is the same as an existing participant.
{% endhint %}

```javascript
growsurf.addParticipant(data, callback);
```

| Parameter      | Data Type        | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`data`**     | String or Object | <p>(Required) A String containing the participant email or an Object containing the participant email and any other data to include for the participant.</p><p></p><p>If providing an Object, any Object keys other than <code>email</code>, <code>firstName</code>,  <code>lastName</code> , and <code>gdprAgreements</code> will be treated as <a href="../../rest-api/api-guidelines#metadata"><code>metadata</code></a> by GrowSurf. <br><br>For more information about metadata please see our <a href="https://docs.growsurf.com/developer-tools/rest-api/api-guidelines">API Guidelines</a>.</p> |
| **`callback`** | Function         | (Optional) A callback function that will be invoked with the added participant data if successful.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

Returns a [Promise ](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)that resolves with an [Object ](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Basics)containing limited participant data.

#### **Example use**

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
// Email only using a Callback
growsurf.addParticipant('gavin@hooli.com', (participant) => {
  // handle participant
});

// Object using a Callback
growsurf.addParticipant({
  email: 'gavin@hooli.com', 
  firstName: 'Gavin', // optional, but recommended for anti-fraud purposes
  lastName: 'Belson', // optional, but recommended for anti-fraud purposes
  company: 'Hooli, Inc', // Fields that are not email, firstName, or lastName will be saved as custom metadata
  companySize: 10000 // Fields that are not email, firstName, or lastName will be saved as custom metadata
}, (participant) => {
  // handle participant
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
// Email only using a Promise
growsurf.addParticipant('gavin@hooli.com').then(participant => {
  // handle participant
});

// Object using a Promise
growsurf.addParticipant({
  email: 'gavin@hooli.com', 
  firstName: 'Gavin', // optional, but recommended for anti-fraud purposes
  lastName: 'Belson', // optional, but recommended for anti-fraud purposes
  company: 'Hooli, Inc', // Fields that are not email, firstName, or lastName will be saved as custom metadata
  companySize: 10000 // Fields that are not email, firstName, or lastName will be saved as custom metadata
}).then(participant => {
  // handle participant
});
```

{% endtab %}
{% endtabs %}

#### Example response

```json
{
    "id": "kafewp",
    "firstName": "Gavin",
    "lastName": "Belson",
    "referralCount": 0,
    "monthlyReferralCount": 0,
    "shareUrl": "https://piedpiper.com?grsf=gavin-kafewp",
    "rewards": [],
    "vanityKeys": [
        "gavin-kafewp"
    ]
}
```

***

## **Trigger referral**

<mark style="color:orange;">Referral programs only</mark>

Triggers a referral, awarding referral credit to the referrer of an existing or new participant. If the program participant does not exist, they will be newly added.

{% hint style="warning" %}
**Note:** A `401` error will be returned but the referral will still be triggered if the following conditions are met: (1) the program has participant authentication enabled, (2) there is no authentication cookie present on the participant's browser, (3) the given email is the same as an existing participant.
{% endhint %}

```javascript
growsurf.triggerReferral(data, callback);
```

| Parameter      | Data Type        | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`data`**     | String or Object | <p>(Optional) A String containing the participant email or an Object containing the participant email and any other data to include for the participant.</p><p></p><p>If providing an Object, any Object keys other than <code>email</code>, <code>firstName</code>, and <code>lastName</code> will be treated as <a href="../../rest-api/api-guidelines#metadata"><code>metadata</code></a> by GrowSurf.</p><p></p><p><em>\*This parameter is only optional if the participant has already signed up for the campaign and GrowSurf is able to determine they are a participant (does not include participants imported or manually added using the dashboard). For more information about metadata please see our</em> <a href="../../rest-api/api-guidelines#metadata"><em>API Guidelines</em></a><em>.</em></p> |
| **`callback`** | Function         | (Optional) A callback function that will be invoked with the added or updated participant data if successful.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

Returns a [Promise ](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)that resolves with an [Object ](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Basics)containing limited participant data.

#### **Example use**

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
// Email only using a Callback
growsurf.triggerReferral('gavin@hooli.com', (participant) => {
  // handle participant
});

// Object using a Callback
growsurf.triggerReferral({
  email: 'gavin@hooli.com', 
  firstName: 'Gavin', // optional, but recommended for anti-fraud purposes
  lastName: 'Belson', // optional, but recommended for anti-fraud purposes
  company: 'Hooli, Inc', // Fields that are not email, firstName, or lastName will be saved as custom metadata
  companySize: 10000 // Fields that are not email, firstName, or lastName will be saved as custom metadata
}, (participant) => {
  // handle participant
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
// Email only using a Promise
growsurf.triggerReferral('gavin@hooli.com').then(participant => {
  // handle participant
});

// Object using a Promise
growsurf.triggerReferral({
  email: 'gavin@hooli.com', 
  firstName: 'Gavin', 
  lastName: 'Belson',
  company: 'Hooli, Inc',
  companySize: 10000
}).then(participant => {
  // handle participant
});
```

{% endtab %}
{% endtabs %}

#### Example response

```json
{
    "id": "kafewp",
    "firstName": "Gavin",
    "lastName": "Belson",
    "referralCount": 0,
    "shareUrl": "https://piedpiper.com?grsf=gavin-kafewp",
    "rewards": [],
    "vanityKeys" [
        "gavin-kafewp"
    ]
}
```

***

## **Get campaign**

Retrieves limited details of a campaign.

```javascript
growsurf.getCampaign(callback);
```

| Parameter      | Data Type | Description                                                                 |
| -------------- | --------- | --------------------------------------------------------------------------- |
| **`callback`** | Function  | (Optional) A callback function that will be invoked with the campaign data. |

Returns a [Promise ](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)that resolves with an [Object ](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Basics)containing limited campaign data of `id` and `rewards`.

#### **Example use**

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
// Using a Callback
growsurf.getCampaign((campaign) => {
    // Handle Campaign
    console.log(campaign);
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
// Using a Promise
growsurf.getCampaign().then(campaign =>  {
    // Handle Campaign
    console.log(campaign);    
});
```

{% endtab %}
{% endtabs %}

#### Example response

```json
{
    "id": "bpsxg4",
    "type": "REFERRAL",
    "rewards": [
        {
            "id": "crew_xyz789",
            "type": "DOUBLE_SIDED",
            "description": "Refer a friend and get $20",
            "referralDescription": "Sign up and get $10 off your first invoice",
            "isUnlimited": false,
            "limit": 1,
            "conversionsRequired": 1,
            "numberOfWinners": 3,
            "imageUrl": "http://res.cloudinary.com/growsurf/image/upload/v1552764861/development/hxdcjrayfhksvxu5u6oz.png",
            "metadata": {
                "rewardValueForReferrer": 20,
                "rewardValueForReferred": 10     
            },
            
            // Only for affiliate programs:
            "commissionStructure": {
                "amount": null,
                "event": "SALE",
                "type": "PERCENT",
                "minPaidReferrals": 3,
                "holdDuration": 30,
                "duration": "FOREVER",
                "durationInMonths": 12,
                "approvalRequired": false,
                "percent": 50,
                "hasMaxAmount": false,
                "maxAmount": null,
                "maxAmountISO": "USD",
                "hasIntro": false,
                "introType": null,
                "introPercent": null,
                "introAmount": null,
                "introAmountISO": "USD",
                "introDuration": "REPEATING",
                "introDurationInMonths": 2            
            }
        }    
    ]
}
```

***

## **Get participant by email**

Retrieves limited details of an existing participant. You will need to supply the unique email of the participant.

{% hint style="warning" %}
**Note:** A `403` error will be returned if the following conditions are met: (1) the program has participant authentication enabled, (2) there is no authentication cookie present on the participant's browser.
{% endhint %}

```javascript
growsurf.getParticipantByEmail(participantEmail, callback);
```

| Parameter              | Data Type | Description                                                                                                                                   |
| ---------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **`participantEmail`** | String    | (Required) The email of the participant to retrieve.                                                                                          |
| **`callback`**         | Function  | (Optional) A callback function that will be invoked with the participant data if successful or `undefined` if the participant does not exist. |

Returns a [Promise ](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)that resolves with an [Object ](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Basics)containing the participant data. If the participant does not exist in the campaign, then `undefined` is returned.

#### **Example use**

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
// Using a callback
growsurf.getParticipantByEmail('gavin@hooli.com', (participant) => {
    // Handle participant data
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
// Using a promise
growsurf.getParticipantByEmail('gavin@hooli.com').then(participant => {
    // Handle participant data
});
```

{% endtab %}
{% endtabs %}

#### Example response

```json
{
    "id": "kafewp",
    "firstName": "Gavin",
    "lastName": "Belson",
    "referralCount": 0,
    "monthlyReferralCount": 0,
    "shareUrl": "https://piedpiper.com?grsf=gavin-kafewp",
    "rewards": [],
    "vanityKeys" [
        "gavin-kafewp"
    ]
}
```

***

## **Get participant by ID**

Retrieves limited details of an existing participant. You will need to supply the GrowSurf unique identifier that was returned upon participant creation.

{% hint style="warning" %}
**Note:** A `403` error will be returned if the following conditions are met: (1) the program has participant authentication enabled, (2) there is no authentication cookie present on the participant's browser.
{% endhint %}

```javascript
growsurf.getParticipantById(participantId, callback);
```

| Parameter           | Data Type | Description                                                                                                                                   |
| ------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **`participantId`** | String    | (Required) The GrowSurf identifier of the participant to retrieve.                                                                            |
| **`callback`**      | Function  | (Optional) A callback function that will be invoked with the participant data if successful or `undefined` if the participant does not exist. |

Returns a [Promise ](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)that resolves with an [Object ](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Basics)containing the participant data. If the participant does not exist in the campaign, then `undefined` is returned.

#### **Example use**

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
// Using a Callback
growsurf.getParticipantById('kafewp', (participant) => {
    // Handle participant data
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
// Using a promise
growsurf.getParticipantById('kafewp').then(participant => {
    // Handle participant data
});
```

{% endtab %}
{% endtabs %}

#### Example response

```json
{
    "id": "kafewp",
    "firstName": "Gavin",
    "lastName": "Belson",
    "referralCount": 0,
    "monthlyReferralCount": 0,
    "shareUrl": "https://piedpiper.com?grsf=gavin-kafewp",
    "rewards": [],
    "vanityKeys" [
        "gavin-kafewp"
    ]
}
```

***

## Get referrer ID

Returns the ID of the participant that referred the visitor or **`null`** if the visitor was not referred. This method will first check to see if a `grsf` URL parameter exists, then will check for the presence of a referrer ID as a browser cookie (which was set from the initial visit).

{% hint style="info" %}
**Example:** Someone refers their friend, and the friend visits <http://yoursite.com?grsf=1h97da>. Calling this method will return `1h97da` (which is the referrer ID).
{% endhint %}

```javascript
growsurf.getReferrerId();
```

#### **Example use**

```javascript
growsurf.getReferrerId();
```

#### Example response

```javascript
"1h97da"
```

{% hint style="info" %}
**Note:** You can verify that the referrer ID is valid by calling [`growsurf.getParticipantById()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#get-participant-by-id)&#x20;
{% endhint %}

***

## Get **participant** ID

Returns the ID of the authenticated participant or **`null`** if there is no participant authentication cookie present.

{% hint style="info" %}
**Example:** Someone signed up as a participant in your referral/affiliate program from your website. Calling this method will return `aj7auu1` (which is the participant ID).
{% endhint %}

```javascript
growsurf.getParticipantId();
```

#### **Example use**

```javascript
growsurf.getParticipantId();
```

**Example response**

```javascript
"aj7auu1"
```

***

## **Get affiliate summary**

<mark style="color:orange;">Affiliate programs only</mark>

Returns affiliate summary statistics for the currently logged-in participant.

{% hint style="warning" %}
**Note:** A `401` error will be returned if the following conditions are met: (1) the program has participant authentication enabled, (2) there is no authentication cookie present on the participant's browser
{% endhint %}

```javascript
growsurf.getAffiliateSummary();
```

Returns a [Promise ](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)that resolves with an [Object ](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Basics)containing limited commissions data.

#### Example use

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
// Using a Callback
growsurf.getAffiliateSummary({}, (summary) => {
  console.log('Affiliate Summary:', summary);
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
// Using a Promise
const summary = await growsurf.getAffiliateSummary();
console.log(summary);
```

{% endtab %}
{% endtabs %}

#### Example response

```json
{
  "referralRevenue": 2500000, // Total revenue generated from referrals (in minor currency units, e.g., cents)
  "totalPaidOut": 1500000, // Total commissions paid out to the affiliate (in minor currency units)
  "upcomingPayout": 500000, // Pending commissions to be paid out (in minor currency units)
  "referrals": 23, // Number of successful referrals
  "leads": 45, // Number of pending referrals (leads)
  "clicks": 23000, // Number of unique visitors from the affiliate's referral link (aka unique impressions)
  "currencyISO": "USD" // The ISO 4217 currency code of the campaign (e.g., "USD")
}
```

***

## **Get commissions**

<mark style="color:orange;">Affiliate programs only</mark>

Returns a paginated list of commissions for the logged-in participant.

{% hint style="warning" %}
**Note:** A `401` error will be returned if the following conditions are met: (1) the program has participant authentication enabled, (2) there is no authentication cookie present on the participant's browser
{% endhint %}

```javascript
growsurf.getCommissions(options, callback);
```

| Parameter            | Data Type | Description                                                                                                                                                                                                                                                          |
| -------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`options`**        | Object    | (Optional) An object containing pagination options.                                                                                                                                                                                                                  |
| **`options.limit`**  | Number    | (Optional) The number of commissions to return per page. Defaults to 20.                                                                                                                                                                                             |
| **`options.nextId`** | String    | (Optional) The ID of the commission to start the next result set with. This can be used to skip through the list or to page the list results. Each response will provide a `nextId` value if there are more commissions otherwise the `nextId` value will be `null`. |

Returns a [Promise ](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)that resolves with an [Object ](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Basics)containing limited commissions data.

#### **Example use**

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
// Using a Callback - First page
growsurf.getCommissions({ limit: 10 }, (result) => {
  console.log(result.commissions); // Array of commission objects
  console.log(result.summary); // Summary of commissions by status
  console.log(result.hasMore); // Boolean indicating if more results are available
  console.log(result.nextId); // Cursor ID for next page (undefined if no more results)
});

// Fetching the next page
growsurf.getCommissions({ limit: 10, nextId: 'comm_abc123' }, (result) => {
  console.log(result.commissions); // Next page of results
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
// Using a Promise - First page
const result = await growsurf.getCommissions({ limit: 10 });
console.log(result.commissions); // Array of commission objects
console.log(result.summary); // Summary of commissions by status

// Fetching additional pages
if (result.hasMore) {
  const nextPage = await growsurf.getCommissions({ limit: 10, nextId: result.nextId });
  console.log(nextPage.commissions); // Next page of results
}
```

{% endtab %}
{% endtabs %}

#### Example response

```json
{
  "commissions": [
    {
      "id": "comm_t1so1w",
      "amount": 7228,
      "currencyISO": "USD",
      "status": "PENDING",
      "holdDuration": 0,
      "createdAt": 1764768074294,
      "amountInCampaignCurrency": 7228,
      "saleAmountAmountInCampaignCurrency": 38900,
      "campaignCurrencyISO": "USD"
    }
  ],
  "summary": {
    "pending": {
      "count": 1,
      "totalAmount": 7228
    },
    "approved": {
      "count": 0,
      "totalAmount": 0
    },
    "paid": {
      "count": 0,
      "totalAmount": 0
    },
    "reversed": {
      "count": 0,
      "totalAmount": 0
    }
  },
  "totalCount": 1,
  "totalAmount": 7228,
  "nextId": "comm_def456",
  "hasMore": true
}
```

***

## **Get payouts**

<mark style="color:orange;">Affiliate programs only</mark>

Returns a paginated list of payouts for the logged-in participant.

{% hint style="warning" %}
**Note:** A `401` error will be returned if the following conditions are met: (1) the program has participant authentication enabled, (2) there is no authentication cookie present on the participant's browser
{% endhint %}

```javascript
growsurf.getPayouts(options, callback);
```

| Parameter            | Data Type | Description                                                                                                                                                                                                                                                  |
| -------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`options`**        | Object    | (Optional) An object containing pagination options.                                                                                                                                                                                                          |
| **`options.limit`**  | Number    | (Optional) The number of payouts to return per page. Defaults to 20.                                                                                                                                                                                         |
| **`options.nextId`** | String    | (Optional) The ID of the payout to start the next result set with. This can be used to skip through the list or to page the list results. Each response will provide a `nextId` value if there are more payouts otherwise the `nextId` value will be `null`. |

Returns a [Promise ](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)that resolves with an [Object ](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Basics)containing limited payouts data.

#### **Example use**

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
// Using a Callback - First page
growsurf.getPayouts({ limit: 10 }, (result) => {
  console.log(result.payouts); // Array of payout objects
  console.log(result.summary); // Summary of payouts by status
  console.log(result.hasMore); // Boolean indicating if more results are available
  console.log(result.nextId); // Cursor ID for next page (undefined if no more results)
});

// Fetching the next page
growsurf.getPayouts({ limit: 10, nextId: 'payout_xyz' }, (result) => {
  console.log(result.payouts); // Next page of results
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
// Using a Promise - First page
const result = await growsurf.getPayouts({ limit: 10 });
console.log(result.payouts); // Array of payout objects
console.log(result.summary); // Summary of commissions by status

// Fetching additional pages
if (result.hasMore) {
  const nextPage = await growsurf.getPayouts({ limit: 10, nextId: result.nextId });
  console.log(nextPage.payouts); // Next page of results
}
```

{% endtab %}
{% endtabs %}

#### Example response

```json
{
	"payouts": [
		{
			"id": "po_kj19ss",
			"amount": 91212,
			"currencyISO": "USD",
			"status": "UPCOMING",
			"createdAt": 1763974665314,
			"amountInCampaignCurrency": 91212,
			"campaignCurrencyISO": "USD"
		},
		{
			"id": "po_asaj1s",
			"amount": 89120,
			"currencyISO": "USD",
			"status": "ISSUED",
			"createdAt": 1763974665314,
			"amountInCampaignCurrency": 89120,
			"campaignCurrencyISO": "USD"
		}
	],
  "summary": {
    "upcoming": {
      "count": 1,
      "totalAmount": 91212
    },
    "queued": {
      "count": 0,
      "totalAmount": 0
    },
    "issued": {
      "count": 1,
      "totalAmount": 89120
    }
  },
	"totalCount": 2,
	"totalAmount": 180332,
	"nextId": "po_x99s1o",
	"hasMore": true
}
```

***

## Initialize **unread notifications badge**

This method will inject an unread notifications badge onto a target element.

<figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2FWwlQlVwMz4XeEV1IqpyN%2Fimage.png?alt=media&#x26;token=291e93a1-621f-4d76-979b-2142898e712e" alt=""><figcaption><p>The unread badge will be injected into your target element</p></figcaption></figure>

This method is useful for highlighting an unread notifications badge to your users from within your own user portal.

We recommend that the target element be a button that opens the GrowSurf window (via [`growsurf.open()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#open-growsurf-window)), because the unread notifications badge will be cleared when the participant views the respective section in the GrowSurf window (rewards section for referral programs; commissions or payouts sections for affiliate programs).

{% hint style="info" %}
Alternatively, you can use [`growsurf.markNotificationsAsRead()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#mark-notifications-as-read) to clear the unread notifications badge.
{% endhint %}

If a participant cookie doesn't exist, the badge will not be displayed on the target element.

```javascript
growsurf.initUnreadNotificationsBadge(targetElement, type);
```

<table><thead><tr><th width="249.33333333333331">Parameter</th><th>Data Type</th><th>Description</th></tr></thead><tbody><tr><td><strong><code>targetElement</code></strong></td><td>String</td><td><p>(Required) The target element</p><p><br>Example: <code>.my-button</code></p></td></tr><tr><td><strong><code>type</code></strong></td><td>String</td><td>(Optional) Available options:<br><br><code>rewards</code><br><code>commissions</code><br><code>payouts</code><br><br>If no <code>type</code> is provided, then all unread notification badges will be initialized.</td></tr></tbody></table>

#### **Example use**

```html
<a class="my-button">
  Refer and Earn
</a>

<script>
  growsurf.initUnreadNotificationsBadge('.my-button');
</script>
```

{% hint style="success" %}

### **CSS Alternative:**

Instead of using the JavaScript method `growsurf.initUnreadNotificationsBadge()`, you can simply add a CSS class `growsurf-unread-notifications-badge`  to your target element. This will also inject the unread badge without requiring JavaScript.\
\
**Here is an example:**

```html
<a href="/refer"
   class="my-button growsurf-unread-notifications-badge">
  Refer and Earn
</a>
```

**Note:** You'll need to make sure you have the [GrowSurf Universal Code](https://docs.growsurf.com/getting-started#get-the-growsurf-universal-code) installed.
{% endhint %}

{% hint style="danger" %}
**Important Note**: Notification counts will not appear if you have certain sections disabled within the *Program Editor > 2. Design > Rewards* section. For example:

* For referral programs, if you have the rewards section hidden (see image below), the notification counts will not appear.

  <div align="left"><figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2Flg0c3Kp8afR8hBuK60EC%2FCampaign%20Editor%20-%20Design%20(Campaign%20pnh44u)%202025-12-11%20at%204.46.23%20PM.png?alt=media&#x26;token=38aff698-17ae-4c99-a735-e5b651a797f3" alt="" width="375"><figcaption></figcaption></figure></div>
* For affiliate programs, if you have the commissions or payouts sections hidden (see image below), the notification counts will only reflect the sections that are enabled.

  <div align="left"><figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2FZiuJ0b5tZo5Xw3cG7I6V%2FCampaign%20Editor%20-%20Design%20(Campaign%20duxyl4)%202025-12-11%20at%204.43.55%20PM.png?alt=media&#x26;token=018e7721-dc90-47ce-83a2-61569a561dd1" alt="" width="375"><figcaption></figcaption></figure></div>

{% endhint %}

***

## Get **unread notifications count**

Returns the number of unread notifications (rewards for referral programs; commissions and payouts for affiliate programs) of the authenticated participant or **`null`** if there is no participant authentication cookie present. This method is useful for highlighting an unread notifications badge to your users from within your own user portal.&#x20;

{% hint style="info" %}
Alternatively, you can use the [`growsurf.initUnreadNotificationsBadge()`](https://docs.growsurf.com/developer-tools/javascript-sdk/initialize-unread-notifications-badge) method for displaying the unread notifications count as a badge on a target element.
{% endhint %}

<table><thead><tr><th width="249.33333333333331">Parameter</th><th>Data Type</th><th>Description</th></tr></thead><tbody><tr><td><strong><code>type</code></strong></td><td>String</td><td>(Optional) Available options:<br><br><code>rewards</code><br><code>commissions</code><br><code>payouts</code><br><br>If no <code>type</code> is provided, then all unread notification counts will be returned.</td></tr></tbody></table>

```javascript
growsurf.getUnreadNotificationsCount(type);
```

#### **Example use**

```javascript
growsurf.getUnreadNotificationsCount('rewards');
```

**Example response**

```javascript
2
```

{% hint style="danger" %}
**Important Note**: Notification counts will not appear if you have certain sections disabled within the *Program Editor > 2. Design > Rewards* section. For example:

* For referral programs, if you have the rewards section hidden (see image below), the notification counts will not appear.

  <div align="left"><figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2Flg0c3Kp8afR8hBuK60EC%2FCampaign%20Editor%20-%20Design%20(Campaign%20pnh44u)%202025-12-11%20at%204.46.23%20PM.png?alt=media&#x26;token=38aff698-17ae-4c99-a735-e5b651a797f3" alt="" width="375"><figcaption></figcaption></figure></div>
* For affiliate programs, if you have the commissions or payouts sections hidden (see image below), the notification counts will only reflect the sections that are enabled.

  <div align="left"><figure><img src="https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-LeklWo0yn03AhWro2Ux%2Fuploads%2FZiuJ0b5tZo5Xw3cG7I6V%2FCampaign%20Editor%20-%20Design%20(Campaign%20duxyl4)%202025-12-11%20at%204.43.55%20PM.png?alt=media&#x26;token=018e7721-dc90-47ce-83a2-61569a561dd1" alt="" width="375"><figcaption></figcaption></figure></div>

{% endhint %}

***

## Mark **notifications as read**

Mark unread notifications of the authenticated participant. This method is useful if you are using [`growsurf.initUnreadNotificationsBadge()`](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#initialize-unread-notifications-badge) instead of the GrowSurf window to show your users their unread notifications count and want to clear out the unread badge.

```javascript
growsurf.markNotificationsAsRead(type);
```

<table><thead><tr><th width="249.33333333333331">Parameter</th><th>Data Type</th><th>Description</th></tr></thead><tbody><tr><td><strong><code>type</code></strong></td><td>String</td><td>(Optional) Available options:<br><br><code>rewards</code><br><code>commissions</code><br><code>payouts</code><br><br>If no <code>type</code> is provided, then all unread notifications will be marked as read.</td></tr></tbody></table>

Returns a [Promise ](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)that resolves with an [Object ](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Basics)with a success response.

#### **Example use**

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
// Using a Callback
growsurf.markNotificationsAsRead(response => {
  // handle success response
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
// Using a Promise
growsurf.markNotificationsAsRead().then(response => {
  // handle success response
});
```

{% endtab %}
{% endtabs %}

#### Example response

```json
{
    "success": true
}
```

***

## **Update social share message**

Updates the pre-populated social share message for the given share type (e.g, email, Facebook, Twitter). This method will update all social share buttons in GrowSurf embedded elements and the GrowSurf window.

{% hint style="info" %}
**Example:** This method is useful for optimizing referral asks when your participants complete an "[aha moment](https://userguiding.com/blog/what-is-aha-moment-how-to-find-it/)". You would present your participant with the [GrowSurf Embedded Form](https://docs.growsurf.com/developer-tools/embeddable-elements#embedded-form) element and then call this method to update social share message(s) to be specific to the "aha moment". See [this tutorial](https://docs.growsurf.com/developer-tools/javascript-sdk/tutorials#example-9-update-pre-populated-share-and-email-invite-messages-to-capitalize-on-a-customer-aha-momen) for an example.
{% endhint %}

```javascript
growsurf.updateSocialShareMessage(type, message, subjectLine);
```

| Parameter         | Data Type | Description                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`type`**        | String    | <p>(Required) The social share type to update.</p><p><br>These are the options:</p><ul><li><code>email</code></li><li><code>facebook</code></li><li><code>twitter</code></li><li><code>threads</code></li><li><code>bluesky</code></li><li><code>pinterest</code></li><li><code>sms</code></li><li><code>whatsapp</code></li><li><code>reddit</code></li><li><code>tumblr</code></li></ul> |
| **`message`**     | String    | <p>(Required) The new pre-populated social share message.</p><p><br>Use <code>{{shareUrl}}</code> to reference the participant's referral link.</p>                                                                                                                                                                                                                                        |
| **`subjectLine`** | String    | <p>(Optional) The new pre-populated subject line (only applies when <code>type</code> is <code>email</code>).</p><p><br>Use <code>{{shareUrl}}</code> to reference the participant's referral link.</p>                                                                                                                                                                                    |

#### **Example use**

```javascript
const message = "I have saved 1,540 hours using this service. Highly recommend! {{shareUrl}}";
const subjectLine = "Check this out!";

// Update the pre-populated email social share message
growsurf.updateSocialShareMessage('email', message, subjectLine);

// Update the pre-populated Facebook social share message
growsurf.updateSocialShareMessage('facebook', message);

// Update the pre-populated Twitter social share message
growsurf.updateSocialShareMessage('twitter', message);

// Update the pre-populated Threads social share message
growsurf.updateSocialShareMessage('threads', message);

// Update the pre-populated Bluesky social share message
growsurf.updateSocialShareMessage('bluesky', message);

// Update the pre-populated Pinterest social share message
growsurf.updateSocialShareMessage('pinterest', message);

// Update the pre-populated SMS social share message
growsurf.updateSocialShareMessage('sms', message);

// Update the pre-populated WhatsApp social share message
growsurf.updateSocialShareMessage('whatsapp', message);

// Update the pre-populated Reddit social share message
growsurf.updateSocialShareMessage('reddit', message);

// Update the pre-populated Tumblr social share message
growsurf.updateSocialShareMessage('tumblr', message);
```

***

## **Update email invite message**

Updates the pre-populated email invite message. This method will only apply updates to [GrowSurf Embedded Invite](https://docs.growsurf.com/developer-tools/embeddable-elements#embedded-invite) elements (the email invite section within the GrowSurf window will not be updated).

{% hint style="info" %}
**Example:** This method is useful for optimizing referral asks when your participants complete an "[aha moment](https://userguiding.com/blog/what-is-aha-moment-how-to-find-it/)". You would present your participant with the [GrowSurf Embedded Invite](https://docs.growsurf.com/developer-tools/embeddable-elements#embedded-invite) element and then call this method to update the email invite message to be specific to the "aha moment".  See [this tutorial](https://docs.growsurf.com/developer-tools/javascript-sdk/tutorials#example-9-update-pre-populated-share-and-email-invite-messages-to-capitalize-on-a-customer-aha-momen) for an example.
{% endhint %}

```javascript
growsurf.updateEmailInviteMessage(message, subjectLine);
```

| Parameter         | Data Type | Description                                                                                                                                         |
| ----------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`message`**     | String    | <p>(Required) The new pre-populated email invite message.</p><p><br>Use <code>{{shareUrl}}</code> to reference the participant's referral link.</p> |
| **`subjectLine`** | String    | <p>(Optional) The new pre-populated subject line.</p><p><br>Use <code>{{shareUrl}}</code> to reference the participant's referral link.</p>         |

#### **Example use**

```javascript
const message = "I have saved 1,540 hours using this service. Highly recommend! {{shareUrl}}";
const subjectLine = "Check this out!";

// Update the pre-populated email invite message and subject line
growsurf.updateEmailInviteMessage(message, subjectLine);
```

## **Log out**

Logs the participant out of the browser (clears the participant's GrowSurf browser cookie and local storage).

```javascript
growsurf.logout();
```

#### **Example use**

```javascript
growsurf.logout();
```

***

## Initialize / Reinitialize GrowSurf

Initializes or reinitializes the `window.growsurf` Object.

{% hint style="info" %}
The method is useful for the following use-cases:

* If you have participant authentication enabled for your program and you would like to [automatically authenticate](https://docs.growsurf.com/getting-started/participant-auto-authentication) your participants after they log in within your own user portal.
* Load multiple programs on a single webpage depending on where the traffic is coming from. [View a tutorial here](https://docs.growsurf.com/developer-tools/javascript-sdk/tutorials#example-10-load-multiple-growsurf-campaigns-on-a-single-webpage).
  {% endhint %}

```javascript
growsurf.init(settings);
```

**Example use**

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
// Using a Callback
growsurf.init({ email: "participant@email.com", hash: "HASH_VALUE" }, () => {
    // GrowSurf is Ready
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
// Using a promise
growsurf.init({ email: "participant@email.com", hash: "HASH_VALUE" }).then(() => {
    // GrowSurf is Ready
});
```

{% endtab %}
{% endtabs %}

| Parameter      | Data Type | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`settings`** | Object    | <p>(Optional) The settings GrowSurf should use when initializing or reinitializing.</p><ul><li><strong><code>campaignId</code></strong>- Provide this to initialize another program</li><li><strong><code>email</code>-</strong> The email of the participant you wish to <a href="../../getting-started/participant-auto-authentication">auto authenticate</a> (only applies if authentication is enabled for your program).</li><li><strong><code>hash</code></strong>- The hash token generated by your server. Used to <a href="../../getting-started/participant-auto-authentication">auto authenticate</a> a participant (only applies if authentication is enabled for your program).</li></ul> |

***

## **Open GrowSurf window**

Opens the GrowSurf window.

```javascript
growsurf.open(callback);
```

| **Parameter**  | Data Type | Description                                                       |
| -------------- | --------- | ----------------------------------------------------------------- |
| **`callback`** | Function  | (Optional) A callback function that will be invoked once complete |

Returns a [Promise ](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)that resolves once complete.

#### **Example use**

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
// Using a Callback
growsurf.open(function() {
    // Do something here
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
// Using a Promise
growsurf.open().then(() => {
    // Do something here
});
```

{% endtab %}
{% endtabs %}

{% hint style="success" %}

### **CSS Alternative:**

Instead of using the JavaScript method `growsurf.open()`, you can simply add a CSS class `growsurf-open-window`  to a button.

A benefit of this option is that if the participant has any unread rewards, the unread badge will automatically show up as well.\
\
**Here is an example:**

```html
<a class="growsurf-open-window">
  Refer and Earn
</a>
```

**Note:** You'll need to make sure you have the [GrowSurf Universal Code](https://docs.growsurf.com/getting-started#get-the-growsurf-universal-code) installed.
{% endhint %}

***

## **Close GrowSurf window**

Closes the GrowSurf window.

```javascript
growsurf.close(callback);
```

| **Parameter**  | Data Type | Description                                                       |
| -------------- | --------- | ----------------------------------------------------------------- |
| **`callback`** | Function  | (Optional) A callback function that will be invoked once complete |

Returns a [Promise ](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)that resolves once complete.

#### **Example use**

{% tabs %}
{% tab title="Using Callbacks" %}

```javascript
// Using a Callback
growsurf.close(() => {
    // Do something here
});
```

{% endtab %}

{% tab title="Using Promises" %}

```javascript
// Using a Promise
growsurf.close().then(() => {
    // Do something here
});
```

{% endtab %}
{% endtabs %}

***

## **Subscribe to event**

Adds an event subscription of the given event type. When an event of the given type occurs, the given callback will be invoked. Below are detailed descriptions of each event type.

```javascript
growsurf.subscribe(eventType, callback);
```

| Parameter       | Data Type | Description                                                                                                                                                                                                                                       |
| --------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`eventType`** | String    | <p>(Required) The event type to subscribe to.</p><p><br>These are the options:</p><ul><li><code>referral</code></li><li><code>referralTrigger</code></li><li><code>signup</code></li><li><code>share</code></li><li><code>invite</code></li></ul> |
| **`callback`**  | Function  | The callback function that will be invoked when the event occurs.                                                                                                                                                                                 |

#### **Example use**

```javascript
/**
 * REFERRED FRIEND EVENTS
 */ 

// Subscribe to a `referral` event type
growsurf.subscribe('referral', (participant) => {
  // A new participant was referred
});

// Subscribe to a `referralTrigger` event type
growsurf.subscribe('referralTrigger', (participant) => {
  // A referred participant triggered a referral (AKA they completed the qualifying action)
});


/**
 * REFERRER EVENTS
 */ 

// Subscribe to a `signup` event type
growsurf.subscribe('signup', (participant) => {
  // A new participant was added (only non-referred signups)
});

// Subscribe to a `share` event type
growsurf.subscribe('share', (data) => {
  // A participant shared their unique referral URL by clicking a social share button
});

// Subscribe to an `invite` event type
growsurf.subscribe('invite', (participant) => {
  // A participant sent out an invite
});
```

#### **Example response**

Dispatched anytime an event happens. The provided callback will be invoked with an Object containing data relevant to the event.

{% tabs %}
{% tab title="'referral' Event" %}
The `'referral'` event returns limited data of the new referred participant. The `referredBy`  key represents the referring participant's unique ID.

```json
{
    "id": "kafewp",
    "email": "gavin@hooli.com",
    "firstName": "Gavin",
    "lastName": "Belson",
    "referredBy": "xyz789",
    "referralCount": 0,
    "shareUrl": "https://piedpiper.com?grsf=kafewp",
    "rewards": [],
    "campaign": {
       "id": "abc123"
    }
}
```

{% endtab %}

{% tab title="'referralTrigger' Event" %}
The `'referralTrigger'` Event returns limited data of the referred participant that triggered a referral (which means they completed a qualifying action).

**Note:** This event happens when calling [`growsurf.triggerReferral()`](https://docs.growsurf.com/integrate/javascript-web-api/api-reference#trigger-referral). If you are looking for the referred signup event, use the 'referral' Event that contains a `referredBy` property.

```json
{
    "id": "kafewp",
    "email": "gavin@hooli.com",
    "firstName": "Gavin",
    "lastName": "Belson",
    "referralCount": 0,
    "shareUrl": "https://piedpiper.com?grsf=kafewp",
    "rewards": [],
    "campaign": {
       "id": "abc123"
    }    
}
```

{% endtab %}

{% tab title="'signup' Event" %}
The `'signup'` Event returns limited data of the new non-referred participant.

```json
{
    "id": "kafewp",
    "email": "gavin@hooli.com",
    "firstName": "Gavin",
    "lastName": "Belson",
    "referralCount": 0,
    "shareUrl": "https://piedpiper.com?grsf=kafewp",
    "rewards": [],
    "campaign": {
       "id": "abc123"
    }    
}
```

{% endtab %}

{% tab title="'share' Event" %}
The `'share'` Event returns limited data of the participant and the share type.

The `shareType`  value will either be a social network (e.g., `linkedin`, `reddit`) or `copyLink` if the participant copied their link to share (e.g., they clicked "Copy Link").

```json
{
    "participant": {
        "id": "kafewp",
        "email": "gavin@hooli.com",
        "firstName": "Gavin",
        "lastName": "Belson",
        "referralCount": 0,
        "shareUrl": "https://piedpiper.com?grsf=kafewp",
        "rewards": []
    },
    "shareType": "facebook",
    "campaign": {
       "id": "abc123"
    }    
}
```

{% endtab %}

{% tab title="'invite' Event" %}
The `'invite'` Event returns limited data of the participant and the number of invites sent.<br>

If your campaign is set up for email invites to be sent by participants, `invitesAttempted` will always match `invitesSent`. If email invites are sent by your company, `invitesSent` will only count successfully delivered emails confirmed by our server. [Learn more here](https://support.growsurf.com/article/353-how-email-invites-work).

```json
{
    "participant": {
        "id": "kafewp",
        "email": "gavin@hooli.com",
        "firstName": "Gavin",
        "lastName": "Belson",
        "referralCount": 0,
        "shareUrl": "https://piedpiper.com?grsf=kafewp",
        "rewards": []
    },
    "invitesAttempted": 3,
    "invitesSent": 3,
    "campaign": {
       "id": "abc123"
    }    
}
```

{% endtab %}
{% endtabs %}
