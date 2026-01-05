# Events Reference

## Overview

* **`PARTICIPANT_REACHED_A_GOAL`** - <mark style="color:orange;">Referral programs only.</mark> When a participant unlocks a new reward.
* **`NEW_PARTICIPANT_ADDED`** - When a new participant is added to the program (includes direct signups, referrals, and participants added/imported via admin dashboard).
* **`PARTICIPANT_FRAUD_STATUS_UPDATED`** - When an existing participant's fraud status changes.
* **`NEW_COMMISSION_ADDED`** - <mark style="color:orange;">Affiliate programs only.</mark> When a new commission is generated for an affiliate.
* **`COMMISSION_ADJUSTED`** - <mark style="color:orange;">Affiliate programs only.</mark> When an existing commission is adjusted (refunds, chargebacks, or refund cancellations).
* **`NEW_PAYOUT_ISSUED`** - <mark style="color:orange;">Affiliate programs only.</mark> When a payout is successfully issued to an affiliate.
* **`CAMPAIGN_ENDED`** - When the program ends.

***

## `PARTICIPANT_REACHED_A_GOAL`

<mark style="color:orange;">Referral programs only</mark>

**Description:** When a participant unlocks a new reward.

{% hint style="info" %}

### **Important notes:**

* **For double-sided rewards,** **two events will be sent for both referrer and referee**. To discern between the two, use the `data.reward.isReferrer` property (the referrer will have `isReferrer` as `true`).
  * You can confirm this by examining `data.reward.referrerId` and `data.reward.referredId`  and comparing it with `data.participant.id`.
  * If the reward is for the referrer, you can view the person they referred by accessing `data.participant.referee`.
  * If the reward is for the referred friend, you can view the person who referred them by accessing `data.participant.referrer`.
* **If you have manual reward approval enabled for your program, events will be sent twice: (1) when the reward is pending approval and (2) when the reward is approved.** To discern between unapproved/approved rewards, use the `data.reward.approved` property (approved rewards will have `approved` as `true`).
* The `data.reward` object contains combined data from the [`CampaignReward`](https://docs.growsurf.com/developer-tools/rest-api/api-objects#reward) and [`ParticipantReward`](https://docs.growsurf.com/developer-tools/rest-api/api-objects#participantreward).
  * `data.reward.rewardId` represents the ID of the `CampaignReward` and will always be the same. You can find this ID from *Program Editor > 1. Rewards* and clicking the reward.
  * `data.reward.id` represents the ID of the `ParticipantReward` that was unlocked for the participant. This will be different for every new reward that the participant earns. You can find this ID by going to your admin dashboard and viewing the participant's rewards.
    {% endhint %}

Here is an example event of a `PARTICIPANT_REACHED_A_GOAL` event where the reward is for the referrer because `data.reward.isReferrer` is `true`. The person they referred is reflected in `data.participant.referee`.

If this reward was for the referred person, then `data.reward.isReferrer`  would be `false`. And the person that referred them would be accessible from `data.participant.referrer`.

```json
{
  "event": "PARTICIPANT_REACHED_A_GOAL",
  "createdAt": 1558345202613,
  "data": {
    "participant": {
      "id": "x9a7uu",
      "email": "richard@piedpiper.com",
      "firstName": "Richard",
      "lastName": "Hendricks",
      "notes": "",
      "rank": 9,
      "isWinner": true,
      "referralCount": 11,
      "monthlyReferralCount": 8,
      "prevMonthlyReferralCount": 0,
      "shareUrl": "http://piedpiper.com?grsf=x9a7uu",
      "impressionCount": 309,
      "uniqueImpressionCount": 285,
      "inviteCount": 285,
      "shareCount": 163,
      "createdAt": 1554431962667,
      "referralSource": "DIRECT",
      "fraudRiskLevel": "LOW",
      "fraudReasonCode": "UNIQUE_IDENTITY",
      "metadata": {
        "piedPiperUserId": "12a39-8aajd-1dwiq",
        "companyName": "Pied Piper, Inc",
        "teamSize": "1-10"
      },
      "unsubscribed": false,
      "referee": {
        "id": "uxjbxu",
        "createdAt": 1738485195346,
        "email": "i_was_referred@somesite.com",
        "firstName": "Billy",
        "lastName": "Smith",
        "notes": "",
        "isWinner": false,
        "referralCount": 0,
        "monthlyReferralCount": 0,
        "prevMonthlyReferralCount": 0,
        "vanityKeys": [],
        "shareUrl": "http://piedpiper.com?grsf=uxjbxu",
        "referralSource": "PARTICIPANT",
        "fraudRiskLevel": "LOW",
        "fraudReasonCode": "UNIQUE_IDENTITY",
        "impressionCount": 0,
        "uniqueImpressionCount": 0,
        "shareCount": 0,
        "metadata": {}
      }
    },
    "reward": {
      "approved": true,
      "conversionsRequired": 1,
      "couponCode": "PROMO_20_OFF",
      "createdAt": 1542560101404,
      "approvedAt": 1659474941892,
      "fulfilledAt": null,
      "description": "Win a free t-shirt when you refer a friend to sign up to Pied Piper!",
      "imageUrl": "https://res.cloudinary.com/growsurf/image/upload/v1553218876/development/ls8shgq3qlwldljr8tl2.jpg",
      "limit": 3,
      "title": "Early-Bird Reward",
      "isReferrer": true,
      "type": "SINGLE_SIDED",
      "rewardId": "crew_xlj123",
      "id": "prew_ccm2ue",
      "referredId": "ad3dfa",
      "referrerId": "x9a7uu",
      "metadata": {
        "foo": "bar",
        "amount": "$25",
        "points": 1000
      }
    },
    "campaign": {
      "id": "ct8f71",
      "name": "Middle Out Compression Campaign",
      "type": "REFERRAL",
      "currencyISO": "USD",
      "rewards": [
        {
          "title": "Early-Bird Reward",        
          "id": "crew_xlj123",
          "type": "SINGLE_SIDED",
          "description": "Win a free t-shirt when you refer a friend to sign up to Pied Piper!",
          "referralDescription": null,          
          "isUnlimited": true,
          "limit": 3,          
          "limitDuration": "IN_TOTAL",
          "conversionsRequired": 1,
          "numberOfWinners": 3,
          "imageUrl": "https://res.cloudinary.com/growsurf/image/upload/v1553218876/development/ls8shgq3qlwldljr8tl2.jpg",                    
          "order": null,
          "couponCode": "PROMO_20_OFF",
          "nextMilestonePrefix": "You are only",
          "nextMilestoneSuffix": "referrals away from receiving a nice reward!",
          "metadata": {
            "foo": "bar",
            "amount": "$25",
            "points": 1000
          }        
        }
      ]
    }
  }
}
```

***

## `NEW_PARTICIPANT_ADDED`

**Description:** When a new participant is added to the program (includes direct signups, referrals, and participants added/imported via admin dashboard).

Here is an example event of a `NEW_PARTICIPANT_ADDED` event where the newly added participant was referred. The person that referred them is reflected in `data.referrer`. If the participant was not referred, then `data.referrer` will not exist.

```json
{
  "event": "NEW_PARTICIPANT_ADDED",
  "createdAt": 1558345215720,
  "data": {
    "id": "p88y0a",
    "email": "gavin.belson@hooli.com",
    "firstName": "Gavin",
    "lastName": "Belson",
    "notes": "This is obviously our competitor trying out our product!",
    "rank": 762,
    "isWinner": false,
    "shareUrl": "http://piedpiper.com?grsf=p88y0a",
    "referralCount": 0,
    "monthlyReferralCount": 0,
    "prevMonthlyReferralCount": 0,
    "impressionCount": 0,
    "uniqueImpressionCount": 0,
    "inviteCount": 0,
    "shareCount": 3,
    "createdAt": 1554479231190,
    "referralSource": "PARTICIPANT",
    "fraudRiskLevel": "LOW",
    "fraudReasonCode": "UNIQUE_IDENTITY",
    "referredBy": "x9a7uu",
    "referrer": {
      "id": "x9a7uu",
      "email": "richard@piedpiper.com",
      "firstName": "Richard",
      "lastName": "Hendricks",
      "notes": "",
      "rank": "9",
      "isWinner": true,
      "referralCount": 11,
      "monthlyReferralCount": 8,
      "shareUrl": "http://piedpiper.com?grsf=x9a7uu",
      "impressionCount": 309,
      "uniqueImpressionCount": 285,
      "inviteCount": 285,
      "shareCount": 163,
      "createdAt": 1554431962667,
      "referralSource": "PARTICIPANT",
      "fraudRiskLevel": "LOW",
      "fraudReasonCode": "UNIQUE_IDENTITY",
      "metadata": {
        "piedPiperUserId": "12a39-8aajd-1dwiq",
        "companyName": "Pied Piper, Inc",
        "teamSize": "1-10"
      },
      "unsubscribed": false,
    },
    "metadata": {
      "piedPiperUserId": "au71p-121x9-88faa",
      "companyName": "Hooli, Inc",
      "teamSize": "10,000+"
    },
    "unsubscribed": false,
    "campaign": {
      "id": "ct8f71",
      "name": "Middle Out Compression Campaign",
      "type": "REFERRAL",
      "currencyISO": "USD",
      "rewards": [
        {
          "title": "Early-Bird Reward",        
          "id": "crew_xlj123",
          "type": "SINGLE_SIDED",
          "description": "Win a free t-shirt when you refer a friend to sign up to Pied Piper!",
          "referralDescription": null,          
          "isUnlimited": true,
          "limit": 3,
          "limitDuration": "IN_TOTAL",
          "conversionsRequired": 1,
          "numberOfWinners": 3,
          "imageUrl": "https://res.cloudinary.com/growsurf/image/upload/v1553218876/development/ls8shgq3qlwldljr8tl2.jpg",                    
          "order": null,
          "couponCode": "PROMO_20_OFF",
          "nextMilestonePrefix": "You are only",
          "nextMilestoneSuffix": "referrals away from receiving a nice reward!",
          "metadata": {
            "foo": "bar",
            "amount": "$25",
            "points": 1000
          }        
        }
      ]
    }    
  }
}
```

***

## `NEW_COMMISSION_ADDED`

<mark style="color:orange;">Affiliate programs only</mark>

**Description:** When a new commission is generated for an affiliate.

```json
{
  "event": "COMMISSION_ADJUSTED",
  "createdAt": 1558345215720,
  "data": {
    "participant": {
      "id": "p88y0a",
      "email": "gavin.belson@hooli.com",
      "firstName": "Gavin",
      "lastName": "Belson",
      "notes": "",
      "rank": 762,
      "isWinner": false,
      "shareUrl": "http://piedpiper.com?grsf=p88y0a",
      "referralCount": 1,
      "monthlyReferralCount": 0,
      "prevMonthlyReferralCount": 0,
      "impressionCount": 2,
      "uniqueImpressionCount": 2,
      "inviteCount": 0,
      "shareCount": 3,
      "createdAt": 1554479231190,
      "referralSource": "DIRECT",
      "fraudRiskLevel": "LOW",
      "metadata": {},
      "unsubscribed": false,
    },
    "referredParticipant": {},
    "campaign": {
      "id": "ct8f71",
      "name": "Middle Out Compression Campaign",
      "type": "REFERRAL",
      "currencyISO": "USD",
      "rewards": []
    },
    "commission": {
      "id": "comm_jp1ku7",
      "referrerId": "f8g9nl",
      "referredId": "xh345d",
      "amount": 2500,
      "currencyISO": "USD",
      "saleAmount": 10000,
      "status": "APPROVED",
      "createdAt": 1731494175123,  
      "approvedAt": 1731580575123,
      "paidAt": null,
      "reversedAt": null,
      "payoutQueuedAt": null,
      "holdDuration": 7,
      "provider": "stripe",
      "amountInCampaignCurrency": 2500,
      "saleAmountInCampaignCurrency": 10000,
      "campaignCurrencyISO": "USD",
      "exchangeRateAt": 1731494175123,
      "fxError": null
    }
  }
}
```

***

## `COMMISSION_ADJUSTED`

<mark style="color:orange;">Affiliate programs only</mark>

**Description:** When an existing commission is adjusted (refunds, chargebacks, or refund cancellations).

```json
{
  "event": "COMMISSION_ADJUSTED",
  "createdAt": 1558345215720,
  "data": {
    "participant": {
      "id": "p88y0a",
      "email": "gavin.belson@hooli.com",
      "firstName": "Gavin",
      "lastName": "Belson",
      "notes": "",
      "rank": 762,
      "isWinner": false,
      "shareUrl": "http://piedpiper.com?grsf=p88y0a",
      "referralCount": 1,
      "monthlyReferralCount": 0,
      "prevMonthlyReferralCount": 0,
      "impressionCount": 2,
      "uniqueImpressionCount": 2,
      "inviteCount": 0,
      "shareCount": 3,
      "createdAt": 1554479231190,
      "referralSource": "DIRECT",
      "fraudRiskLevel": "LOW",
      "metadata": {},
      "unsubscribed": false,
    },
    "referredParticipant": {},
    "campaign": {
      "id": "ct8f71",
      "name": "Middle Out Compression Campaign",
      "type": "REFERRAL",
      "currencyISO": "USD",
      "rewards": []
    },
    "adjustment": {
      "currencyISO": "USD",
      "originalCommissionAmount": 9900,
      "newCommissionAmount": 0,
      "commissionAdjustedAmount": -9900,
      "reason": "FULL_REFUND",
      "adjustedAt": 1766393352171
    },
    "adjustedCommission": {
      "id": "comm_jp1ku7",
      "referrerId": "f8g9nl",
      "referredId": "xh345d",
      "amount": 2500,
      "currencyISO": "USD",
      "saleAmount": 10000,
      "status": "PENDING",
      "createdAt": 1731494175123,  
      "approvedAt": null,
      "paidAt": null,
      "reversedAt": null,
      "payoutQueuedAt": null,
      "holdDuration": 14,
      "provider": "stripe",
      "amountInCampaignCurrency": 2500,
      "saleAmountInCampaignCurrency": 10000,
      "campaignCurrencyISO": "USD",
      "exchangeRateAt": 1731494175123,
      "fxError": null
    }    
  }
}
```

***

## `NEW_PAYOUT_ISSUED`

<mark style="color:orange;">Affiliate programs only</mark>

**Description:** When a payout is successfully issued to an affiliate.

```json
{
  "event": "NEW_PAYOUT_ISSUED",
  "createdAt": 1558345215720,
  "data": {
    "participant": {
      "id": "p88y0a",
      "email": "gavin.belson@hooli.com",
      "firstName": "Gavin",
      "lastName": "Belson",
      "notes": "",
      "rank": 762,
      "isWinner": false,
      "shareUrl": "http://piedpiper.com?grsf=p88y0a",
      "referralCount": 1,
      "monthlyReferralCount": 0,
      "prevMonthlyReferralCount": 0,
      "impressionCount": 2,
      "uniqueImpressionCount": 2,
      "inviteCount": 0,
      "shareCount": 3,
      "createdAt": 1554479231190,
      "referralSource": "DIRECT",
      "fraudRiskLevel": "LOW",
      "metadata": {},
      "unsubscribed": false,
    },
    "referredParticipant": {},
    "campaign": {
      "id": "ct8f71",
      "name": "Middle Out Compression Campaign",
      "type": "REFERRAL",
      "currencyISO": "USD",
      "rewards": []
    },
    "payout": {
      "id": "po_k11ps9",
      "participantId": "f8g9nl",
      "commissionIds": [
        "comm_jp1ku7",
        "comm_a98s7z"
      ],
      "amount": 3600,
      "currencyISO": "USD",
      "status": "ISSUED",
      "createdAt": 1731494295334,  
      "issuedAt": 1731580575123,
      "failedAt": null,
      "provider": "paypal",
      "amountInCampaignCurrency": 3600,
      "campaignCurrencyISO": "USD",
      "exchangeRateAt": 1731580575217,
      "exchangeRate": 1.0,
      "fxError": null
    }    
  }
}
```

***

## `PARTICIPANT_FRAUD_STATUS_UPDATED`

**Description:** When an existing participant's fraud status changes.

This webhook event is emitted if either of the following happens:

* If you manually mark a participant as a fraudster or non-fraudster from the GrowSurf admin dashboard. [Learn more here](https://support.growsurf.com/article/195-what-does-the-growsurf-anti-fraud-system-entail).
* If GrowSurf's anti-fraud system automatically identifies a referrer as a fraudster after they tried referring someone.

Here is an example of a `PARTICIPANT_FRAUD_STATUS_UPDATED` event where you can check the participant's fraud status via `data.participant.fraudRiskLevel` (it will be one of the following options: `"LOW"`, `"MEDIUM"`, or `"HIGH"`). You can also check the fraud reason code via `data.participant.fraudReasonCode` (see the [`Participant`](https://docs.growsurf.com/developer-tools/rest-api/api-objects#participant) object for all fraud reason code options).

```json
{
  "event": "PARTICIPANT_FRAUD_STATUS_UPDATED",
  "createdAt": 1558345215720,
  "data": {
    "participant": {
      "id": "p88y0a",
      "email": "gavin.belson@hooli.com",
      "firstName": "Gavin",
      "lastName": "Belson",
      "notes": "This is obviously our competitor trying out our product!",
      "rank": 762,
      "isWinner": false,
      "shareUrl": "http://piedpiper.com?grsf=p88y0a",
      "referralCount": 0,
      "monthlyReferralCount": 0,
      "prevMonthlyReferralCount": 0,
      "impressionCount": 0,
      "uniqueImpressionCount": 0,
      "inviteCount": 0,
      "shareCount": 3,
      "createdAt": 1554479231190,
      "referralSource": "PARTICIPANT",
      "fraudRiskLevel": "HIGH",
      "fraudReasonCode": "REFERRAL_CHAIN_FRAUD",
      "referredBy": "x9a7uu",
      "referrer": {
        "id": "x9a7uu",
        "email": "richard@piedpiper.com",
        "firstName": "Richard",
        "lastName": "Hendricks",
        "notes": "",
        "rank": "9",
        "isWinner": true,
        "referralCount": 11,
        "monthlyReferralCount": 8,
        "shareUrl": "http://piedpiper.com?grsf=x9a7uu",
        "impressionCount": 309,
        "uniqueImpressionCount": 285,
        "inviteCount": 285,
        "shareCount": 163,
        "createdAt": 1554431962667,
        "referralSource": "PARTICIPANT",
        "fraudRiskLevel": "LOW",
        "fraudReasonCode": "UNIQUE_IDENTITY",
        "metadata": {
          "piedPiperUserId": "12a39-8aajd-1dwiq",
          "companyName": "Pied Piper, Inc",
          "teamSize": "1-10"
        },
        "unsubscribed": false,
      },
      "metadata": {
        "piedPiperUserId": "au71p-121x9-88faa",
        "companyName": "Hooli, Inc",
        "teamSize": "10,000+"
      },
      "unsubscribed": false,
    },
    "campaign": {
      "id": "ct8f71",
      "name": "Middle Out Compression Campaign",
      "type": "REFERRAL",
      "currencyISO": "USD",
      "rewards": [
        {
          "title": "Early-Bird Reward",        
          "id": "crew_xlj123",
          "type": "SINGLE_SIDED",
          "description": "Win a free t-shirt when you refer a friend to sign up to Pied Piper!",
          "referralDescription": null,          
          "isUnlimited": true,
          "limit": 3,
          "limitDuration": "IN_TOTAL",
          "conversionsRequired": 1,
          "numberOfWinners": 3,
          "imageUrl": "https://res.cloudinary.com/growsurf/image/upload/v1553218876/development/ls8shgq3qlwldljr8tl2.jpg",                    
          "order": null,
          "couponCode": "PROMO_20_OFF",
          "nextMilestonePrefix": "You are only",
          "nextMilestoneSuffix": "referrals away from receiving a nice reward!",
          "metadata": {
            "foo": "bar",
            "amount": "$25",
            "points": 1000
          }        
        }
      ]
    }    
  }
}
```

***

## `CAMPAIGN_ENDED`

**Description:** When the program ends.

{% hint style="info" %}
**Please note:** Only the first 1,000 will be returned in the `winners` Array.
{% endhint %}

```json
{
  "event": "CAMPAIGN_ENDED",
  "createdAt": 1558345152138,
  "data": {
    "id": "ct8f71",
    "name": "Middle-Out Compression Launch",
    "type": "REFERRAL",
    "participantCount": 5661,
    "startedAt": 1522432573250,
    "endedAt": 1533532422153,
    "status": "COMPLETE",
    "impressionCount": 11075,
    "referralCount": 1673,
    "winnerCount": 1673,
    "winners": [
      {
        "id": "x9a7uu",
        "email": "richard@piedpiper.com",
        "firstName": "Richard",
        "lastName": "Hendricks",
        "notes": "",
        "rank": 9,
        "isWinner": true,
        "referralCount": 11,
        "monthlyReferralCount": 8,
        "prevMonthlyReferralCount": 0,
        "shareUrl": "http://piedpiper.com?grsf=x9a7uu",
        "impressionCount": 309,
        "uniqueImpressionCount": 285,        
        "shareCount": 163,
        "createdAt": 1554431962667,
        "referralSource": "PARTICIPANT",
        "fraudRiskLevel": "LOW",
        "fraudReasonCode": "UNIQUE_IDENTITY",        
        "metadata": {
          "piedPiperUserId": "12a39-8aajd-1dwiq",
          "companyName": "Pied Piper, Inc",
          "teamSize": "1-10"
        },
        "unsubscribed": false,
      }
    ],
    "rewards": [
      {
        "title": "Early-Bird Reward",        
        "id": "crew_xlj123",
        "type": "SINGLE_SIDED",
        "description": "Win a free t-shirt when you refer a friend to sign up to Pied Piper!",
        "referralDescription": null,          
        "isUnlimited": true,
        "limit": 3,
        "limitDuration": "IN_TOTAL",
        "conversionsRequired": 1,
        "numberOfWinners": 3,
        "imageUrl": "https://res.cloudinary.com/growsurf/image/upload/v1553218876/development/ls8shgq3qlwldljr8tl2.jpg",                    
        "order": null,
        "couponCode": "PROMO_20_OFF",
        "nextMilestonePrefix": "You are only",
        "nextMilestoneSuffix": "referrals away from receiving a nice reward!",
        "metadata": {
          "foo": "bar",
          "amount": "$25",
          "points": 1000
        }        
      }
    ]    
  }
}
```
