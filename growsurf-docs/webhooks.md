# Webhooks

## Example scenarios

Here are a few scenarios in which you would use webhooks:

* If you want to have an internal points system for your users, webhooks let you add credits to users in your database every time a referral happens.
* Every time a new participant joins your referral/affiliate program, webhooks lets you save their unique referral link (and other information) into your database.

## Getting started

### Step 1: Add a webhook URL to your program

1. Go to the *Options* step in the *Program Editor*.
2. In the *Set up integrations* sectio&#x6E;*,* click the *Webhooks* card. Then enter your webhook endpoint URL.
3. Publish/save your changes.

![Webhooks can be configured in the Options step in the Program Editor](https://2794996218-files.gitbook.io/~/files/v0/b/gitbook-legacy-files/o/assets%2F-LeklWo0yn03AhWro2Ux%2F-M5jy3U18AuDc-S2tkbf%2F-M5jydIZ_kfOQzlt-GYV%2FScreen%20Shot%20on%202020-04-25%20at%2001%3A15%3A55.png?alt=media\&token=e2686f97-1529-47f7-bbf4-5c1fd9b11eda)

{% hint style="info" %}
**Tips:**

* You can test your webhook URL to see if it is set up properly and/or to see the different types of data from each webhook event. Simply click the *Test* button right next to the webhook URL input field.
* You can select the specific events to receive within the *advanced webhook settings* section.
* A total of 5 webhooks can be added per program.
  {% endhint %}

## **Retry logic**

If we are unable to deliver a webhook the first time, GrowSurf will attempt to redeliver your webhooks for several days with an exponential back off. After several days of failed attempts we will mark the webhook as undeliverable and it will no longer be retried.

GrowSurf uses a queue system with persistent storage, so if our webhook servers ever experience downtime or become unavailable, webhook events will be retried once the servers are restored. You can always check our [System Status page](https://growsurf.com/status) for webhook health.

## **Next steps**

View [Examples](https://docs.growsurf.com/developer-tools/webhooks/examples) of implementing webhooks, or view what the request payloads for webhook events look like:

* [When a participant reaches a reward goal](https://docs.growsurf.com/developer-tools/events-reference#participant_reached_a_goal)
* [When a new participant is added to the program](https://docs.growsurf.com/developer-tools/webhooks/events-reference#new_participant_added)
* [When the program ends](https://docs.growsurf.com/developer-tools/webhooks/events-reference#campaign_ended)
