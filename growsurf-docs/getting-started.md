# Getting Started for Web

{% hint style="info" %}

### Sandbox/testing environment

To start building your referral or affiliate program in a "sandbox" environment, we recommend creating two GrowSurf separate programs (one for development and one for production).

A program, also known as campaign, is simply a referral or affiliate program. Every GrowSurf program has a unique ID that you can find in the URL or from the program's GrowSurf Universal Code. [Learn more here](https://support.growsurf.com/article/262-how-can-i-test-in-a-sandbox-or-development-environment).
{% endhint %}

## Step 1: Install the GrowSurf Universal Code onto your site

#### Get the GrowSurf Universal Code.

The *GrowSurf Universal Code* is what allows referrals to be tracked and credited properly.

It's also what powers the GrowSurf window and embeddable elements to be displayed to your participants so that they can get their unique share link, click social share buttons, and check their referral stats and/or the leaderboard.

The GrowSurf Universal Code is a snippet of JavaScript that you paste into the \<HEAD> of your website.

To get your program-specific GrowSurf Universal Code, follow the *Installation* steps in the *Program Editor* until you get to the instructions page (see image below).

![Find your program-specific GrowSurf Universal Code in the Installation step of the Program Editor](https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-legacy-files/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-LfJtVOuiBb7Hj-PgFoL%2F-LfJyLczHVfm3nA0KajL%2FScreen%20Shot%20on%202019-05-20%20at%2019%3A21%3A04.png?alt=media\&token=e97f03e0-df10-4f80-bca9-f8d62d7c5c42)

{% hint style="info" %}
**Note:**

* Your program-specific GrowSurf Universal Code will work on any URL that shares the same origin ([what's same-origin?](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)) as the *Share URL* or *Signup URL* that you entered in the *Installation* step of the *Program Editor*. [Click here for image](https://blobscdn.gitbook.com/v0/b/gitbook-28427.appspot.com/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-LfUACx31pyQJHxsgdvN%2F-LfUAF1aWVBnBJ5YshXz%2FScreen%20Shot%20on%202019-05-22%20at%2018%3A53%3A26.png?alt=media\&token=0ae62744-aa53-44d8-ab40-2a1d2bae4132)
* If you have *Participant authentication/login* enabled, you may want to set up [*Participant Auto Authentication*](https://docs.growsurf.com/getting-started/participant-auto-authentication)*.*
* To set up a development process that supports multiple environments (e.g, development, production), [view this article](https://support.growsurf.com/article/262-how-can-i-test-in-a-sandbox-or-development-environment).
  {% endhint %}

## Step 2: Integrate with GrowSurf API(s)

Use our client-side or server-side APIs to integrate with GrowSurf to add participants and to trigger referrals.

| Development Tool                                                                   | Type        | Description                                                                                                                             |
| ---------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| [**JavaScript Web API**](https://docs.growsurf.com/developer-tools/javascript-sdk) | Client-side | Create new participants, trigger referrals, get limited program data, get limited participant data, and open/close the GrowSurf window. |
| [**REST API**](https://docs.growsurf.com/developer-tools/rest-api)                 | Server-side | Create new participants, trigger referrals, get program data, and get participant data from a secure environment.                       |

## Step 3: Automate reward fulfillment

Set up automatic reward fulfillment and data syncing by using [Webhooks](https://docs.growsurf.com/developer-tools/webhooks) and/or [Zapier](https://docs.growsurf.com/integrations/zapier).

## Troubleshooting

To troubleshoot common issues during installation, check out [Help Center - Installation](https://support.growsurf.com/category/232-troubleshooting) articles.
