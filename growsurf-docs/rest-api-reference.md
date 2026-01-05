# API Reference

## Open in Postman

Easily test these API methods dynamically by using our Postman Collection.  Just change the `Token` in the Authorizations tab, and the `campaign_id` variable to the program you're working on.

[![Run in Postman](https://run.pstmn.io/button.svg)](https://www.postman.com/growsurf/growsurf-public/collection/csnytdd/growsurf-rest-api)

***

## CAMPAIGNS ↓

### Get Campaign

<mark style="color:blue;">`GET`</mark> `https://api.growsurf.com/v2/campaign/:id`

Retrieves a program for the given program ID.

#### Path Parameters

| Name                                 | Type   | Description                       |
| ------------------------------------ | ------ | --------------------------------- |
| id<mark style="color:red;">\*</mark> | string | The ID of the program to retrieve |

#### Response

{% tabs %}
{% tab title="200" %}
Returns the program.

```json
{
    "id": "abc123",
    "name": "Middle Out Compression Campaign",
    "type": "REFERRAL",
    "referralCount": 121,
    "participantCount": 199,
    "impressionCount": 199,
    "inviteCount": 237,    
    "winnerCount": 1,
    "currencyISO": "USD",
    "status": "IN_PROGRESS",
    "rewards": [
        {
            "id": "crew_xyz789",
            "type": "DOUBLE_SIDED",
            "description": "Refer a friend and get a Pied Piper T-Shirt",
            "referralDescription": "Join and receive middle out compression algorithm",
            "isUnlimited": false,
            "limit": 1,
            "conversionsRequired": 1,
            "numberOfWinners": 3,
            "imageUrl": "http://res.cloudinary.com/growsurf/image/upload/v1552764861/development/hxdcjrayfhksvxu5u6oz.png",
            "metadata": {}
        }
    ]
}
```

{% endtab %}
{% endtabs %}

### Get Campaigns

<mark style="color:blue;">`GET`</mark> `https://api.growsurf.com/v2/campaigns`

Retrieves a list of your programs. Programs that have been deleted will not be returned in this response.

#### Response

{% tabs %}
{% tab title="200" %}
Returns the programs.

```json
{
    "campaigns": [
        {
            "id": "abc123",
            "name": "Middle Out Compression Campaign",
            "type": "REFERRAL",
            "referralCount": 20500,
            "participantCount": 40000,
            "impressionCount": 100000,
            "winnerCount": 1500,
            "inviteCount": 100,
            "status": "IN_PROGRESS",
            "currencyISO": "USD",
            "rewards": [
                {
                    "id": "crew_xyz789",
                    "type": "DOUBLE_SIDED",
                    "description": "Refer a friend and get a Pied Piper T-Shirt",
                    "referralDescription": "Join and receive middle out compression algorithm",
                    "isUnlimited": false,
                    "limit": 1,
                    "conversionsRequired": 1,
                    "numberOfWinners": 3,
                    "imageUrl": "http://res.cloudinary.com/growsurf/image/upload/v1552764861/development/hxdcjrayfhksvxu5u6oz.png",
                    "metadata": {}
                }
            ]
        },
        {
            "id": "ljtqn5",
            "name": "Newsletter Referral Campaign",
            "referralCount": 30500,
            "participantCount": 60000,
            "impressionCount": 110000,
            "winnerCount": 750,
            "inviteCount": 25,
            "status": "IN_PROGRESS",
            "currencyISO": "USD",
            "rewards": [
                {
                    "id": "crew_qiar1r",
                    "type": "SINGLE_SIDED",
                    "description": "First 3 referrers receive one month free.",
                    "isUnlimited": false,
                    "limit": 1,
                    "conversionsRequired": 1,
                    "numberOfWinners": 3,
                    "imageUrl": "https://res.cloudinary.com/growsurf/image/upload/v1593807417/development/wg7xzingezfbmrh7zg7m.png",
                    "metadata": {}
                }
            ]
        }
    ]
}
```

{% endtab %}
{% endtabs %}

***

## PARTICIPANTS ↓

### Get Participant by ID

<mark style="color:blue;">`GET`</mark> `https://api.growsurf.com/v2/campaign/:id/participant/:participantId`

Retrieves a single participant from a program using the given participant ID.

#### Path Parameters

| Name                                            | Type   | Description                                            |
| ----------------------------------------------- | ------ | ------------------------------------------------------ |
| id<mark style="color:red;">\*</mark>            | string | The ID of the program to retrieve the participant from |
| participantId<mark style="color:red;">\*</mark> | string | The ID of the participant to retrieve                  |

#### Response

{% tabs %}
{% tab title="200" %}
Returns the participant object.

```json
{
    "id": "f8g9nl",
    "firstName": "Gavin",
    "lastName": "Belson",
    "referralCount": 2,
    "monthlyReferralCount": 2,
    "prevMonthlyReferralCount": 0,
    "rank": 10001,
    "monthlyRank": 20001,
    "monthlyRank": -1,
    "shareUrl": "https://piedpiper.com?grsf=gavin-f8g9nl",
    "email": "gavin@hoolie.com",
    "createdAt": 1552404738928,
    "fraudRiskLevel": "LOW",
    "fraudReasonCode": "UNIQUE_IDENTIY",
    "isWinner": true,
    "shareCount": {
        "email": 10,
        "facebook": 1,
        "pinterest": 1,
        "twitter": 11
    },
    "impressionCount": 2,
    "uniqueImpressionCount": 2,
    "inviteCount": 3,
    "referrals": [
        "i9g2bh",
        "xua4sq"
    ],
    "monthlyReferrals": [
        "i9g2bh",
        "xua4sq"
    ],
    "referralSource": "PARTICIPANT",
    "referralStatus": "CREDIT_AWARDED",
    "referrer": {
        "id": "h8kp6l",
        "firstName": "Richard",
        "lastName": "Hendricks",
        "referralCount": 5,
        "monthlyReferralCount": 2,
        "prevMonthlyReferralCount": 100,        
        "rank": 100,
        "monthlyRank": 110,
        "prevMonthlyRank": 10,
        "shareUrl": "https://piedpiper.com?grsf=h8kp6l",
        "email": "richard@piedpiper.com",
        "createdAt": 1552402661449,
        "referralSource": "DIRECT",
        "fraudRiskLevel": "LOW",
        "fraudReasonCode": "UNIQUE_IDENTIY",
        "isWinner": true,
        "shareCount": {
            "email": 20,
            "facebook": 11,
            "linkedin": 0,
            "pinterest": 3,
            "twitter": 12
        },
        "impressionCount": 14,
        "uniqueImpressionCount": 11,   
        "inviteCount": 12,   
        "referrals": [
            "0dveu7",
            "f8g9nl",
            "j0hbym",
            "m5xm9l",
            "w01fil"
        ],
        "monthlyReferrals": [
            "m5xm9l",
            "w01fil"
        ],
        "ipAddress": "113.2.2.9",
        "fingerprint": "dau221bd47ba661c51ca933d531e47f5",
        "metadata": {},   
        "unsubscribed": false
    },
    "ipAddress": "127.0.0.1",
    "fingerprint": "cfb163bd47ba666c52cb932c521e47f4",    
    "metadata": {
       "company": "Hooli, Inc",
       "companySize": 10000
    },
    "unsubscribed": false,
    "rewards": [
        {
            "id": "prew_dgaiuk",
            "rewardId": "crew_oe1cjt",
            "status": "FULFILLED",
            "unread": true,
            "isReferrer": true,
            "isAvailable": true,
            "approved": true,
            "isFulfilled": true
            "referredId": "xh345d",
            "referrerId": "f8g9nl"
        }
    ],
    "vanityKeys": [
        "gavin-f8g9nl"
    ]
}
```

{% endtab %}
{% endtabs %}

### Get Participant by Email

<mark style="color:blue;">`GET`</mark> `https://api.growsurf.com/v2/campaign/:id/participant/:participantEmail`

Retrieves a single participant from a program using the given participant email.

#### Path Parameters

| Name                                               | Type   | Description                                            |
| -------------------------------------------------- | ------ | ------------------------------------------------------ |
| id<mark style="color:red;">\*</mark>               | string | The ID of the program to retrieve the participant from |
| participantEmail<mark style="color:red;">\*</mark> | string | The email address of the participant to retrieve       |

#### Response

{% tabs %}
{% tab title="200" %}
Returns the participant object.

```json
{
    "id": "f8g9nl",
    "firstName": "Gavin",
    "lastName": "Belson",
    "referralCount": 2,
    "monthlyReferralCount": 2,
    "prevMonthlyReferralCount": 0,
    "rank": 10001,
    "monthlyRank": 50,
    "prevMonthlyRank": -1,
    "shareUrl": "https://piedpiper.com?grsf=gavin-f8g9nl",
    "email": "gavin@hoolie.com",
    "createdAt": 1552404738928,
    "fraudRiskLevel": "LOW",
    "fraudReasonCode": "UNIQUE_IDENTIY",
    "isWinner": true,
    "shareCount": {
        "email": 10,
        "facebook": 1,
        "pinterest": 1,
        "twitter": 11
    },
    "impressionCount": 2,
    "uniqueImpressionCount": 2,
    "inviteCount": 3,
    "referrals": [
        "i9g2bh",
        "xua4sq"
    ],
    "monthlyReferrals": [
        "i9g2bh",
        "xua4sq"
    ],
    "referralSource": "PARTICIPANT",
    "referralStatus": "CREDIT_AWARDED",
    "referrer": {
        "id": "h8kp6l",
        "firstName": "Richard",
        "lastName": "Hendricks",
        "referralCount": 5,
        "monthlyReferralCount": 2,
        "prevMonthlyReferralCount": 100,        
        "rank": 100,
        "monthlyRank": 110,
        "prevMonthlyRank": 10,
        "shareUrl": "https://piedpiper.com?grsf=h8kp6l",
        "email": "richard@piedpiper.com",
        "createdAt": 1552402661449,
        "referralSource": "DIRECT",
        "fraudRiskLevel": "LOW",
        "fraudReasonCode": "UNIQUE_IDENTIY",
        "isWinner": true,
        "shareCount": {
            "email": 20,
            "facebook": 11,
            "linkedin": 0,
            "pinterest": 3,
            "twitter": 12
        },
        "impressionCount": 14,
        "uniqueImpressionCount": 11,   
        "inviteCount": 12,   
        "referrals": [
            "0dveu7",
            "f8g9nl",
            "j0hbym",
            "m5xm9l",
            "w01fil"
        ],
        "monthlyReferrals": [
            "m5xm9l",
            "w01fil"
        ],
        "ipAddress": "113.2.2.9",
        "fingerprint": "dau221bd47ba661c51ca933d531e47f5",
        "metadata": {},
        "unsubscribed": false,
    },
    "ipAddress": "127.0.0.1",
    "fingerprint": "cfb163bd47ba666c52cb932c521e47f4",    
    "metadata": {
       "company": "Hooli, Inc",
       "companySize": 10000
    },
    "unsubscribed": false,
    "rewards": [
        {
            "id": "prew_dgaiuk",
            "rewardId": "crew_oe1cjt",
            "status": "FULFILLED",
            "unread": true,
            "isReferrer": true,
            "isAvailable": true,
            "approved": true,
            "isFulfilled": true,
            "referredId": "xh345d",
            "referrerId": "f8g9nl"
        }
    ],
    "vanityKeys": [
        "gavin-f8g9nl"
    ]
}
```

{% endtab %}
{% endtabs %}

### Get Participants

<mark style="color:blue;">`GET`</mark> `https://api.growsurf.com/v2/campaign/:id/participants`

Retrieves a list of participants in the program.

#### Path Parameters

| Name                                 | Type   | Description           |
| ------------------------------------ | ------ | --------------------- |
| id<mark style="color:red;">\*</mark> | string | The ID of the program |

#### Query Parameters

| Name   | Type    | Description                                                                                                                                                                                                                                                                                                           |
| ------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| nextId | string  | <p>(Optional)<br><br>The ID of the participant to start the next result set with. This can be used to skip through the list or to page the list results. Each response will provide a <code>nextId</code> value if there are more participants otherwise the <code>nextId</code> value will be <code>null</code>.</p> |
| limit  | integer | <p>(Optional)<br><br>The number of participants to return. Must be a value less than or equal to 100 which is currently the maximum we allow with this request.</p>                                                                                                                                                   |

#### Response

{% tabs %}
{% tab title="200" %}
Returns the participant objects.

```json
{
    "participants": [
         {
            "id": "3vxff9",
            "firstName": "Gavin",
            "lastName": "Belson",
            "referralCount": 0,
            "monthlyReferralCount": 0,
            "prevMonthlyReferralCount": 0,
            "rank": 10001,
            "monthlyRank": 50,
            "prevMonthlyRank": -1,
            "shareUrl": "https://hoolie.com?grsf=gavin-3vxff9",
            "rewards": [],
            "email": "gavin@hooli.com",
            "createdAt": 1558665537426,
            "referralSource": "DIRECT",
            "isWinner": false,
            "shareCount": {
                "email": 0,
                "facebook": 0,
                "linkedin": 0,
                "pinterest": 0,
                "twitter": 0
            },
            "impressionCount": 0,
            "uniqueImpressionCount": 0,
            "inviteCount": 3,
            "referrals": [],
            "referrer": null,
            "metadata": {},
            "rewards": [],
            "vanityKeys": [
                "gavin-3vxff9"
            ],
            "metadata": {},
            "unsubscribed": false,
        },
        {
            "id": "f8g9nl",
            "firstName": "Gavin",
            "lastName": "Belson",
            "referralCount": 2,
            "monthlyReferralCount": 2,
            "prevMonthlyReferralCount": 721,
            "rank": 10002,
            "monthlyRank": 110,
            "prevMonthlyRank": 1,
            "shareUrl": "https://piedpiper.com?grsf=gavin-f8g9nl",
            "email": "gavin@hoolie.com",
            "createdAt": 1552404738928,
            "fraudRiskLevel": "LOW",
            "fraudReasonCode": "UNIQUE_IDENTIY",
            "isWinner": true,
            "shareCount": {
                "email": 10,
                "facebook": 1,
                "pinterest": 1,
                "twitter": 11
            },
            "impressionCount": 2,
            "uniqueImpressionCount": 2,
            "inviteCount": 3,            
            "referrals": [
                "i9g2bh",
                "xua4sq"
            ],
            "referralSource": "PARTICIPANT",
            "referralStatus": "CREDIT_AWARDED",
            "referrer": {
                "id": "h8kp6l",
                "firstName": "Richard",
                "lastName": "Hendricks",
                "referralCount": 5,
                "monthlyReferralCount": 5,
                "prevMonthlyReferralCount": 100,
                "rank": 100,
                "monthlyRank": 100,
                "prevMonthlyRank": 13,
                "shareUrl": "https://piedpiper.com?grsf=h8kp6l",
                "email": "richard@piedpiper.com",
                "createdAt": 1552402661449,
                "referralSource": "DIRECT",
                "fraudRiskLevel": "LOW",
                "fraudReasonCode": "UNIQUE_IDENTIY",
                "isWinner": true,
                "shareCount": {
                    "email": 20,
                    "facebook": 11,
                    "linkedin": 0,
                    "pinterest": 3,
                    "twitter": 12
                },
                "impressionCount": 14,
                "uniqueImpressionCount": 12,
                "inviteCount": 12,                
                "referrals": [
                    "0dveu7",
                    "f8g9nl",
                    "j0hbym",
                    "m5xm9l",
                    "w01fil"
                ],
                "metadata": {},
                "unsubscribed": false,
            },
            "metadata": {},
            "unsubscribed": false,
            "rewards": [],
            "vanityKeys": [
                "gavin-f8g9nl"
            ]
        }
    ],
    "limit": 2,
    "nextId": "1u7v0q"
}
```

{% endtab %}
{% endtabs %}

### Get Leaderboard

<mark style="color:blue;">`GET`</mark> `https://api.growsurf.com/v2/campaign/:id/leaderboard`

Retrieves a list of participants in the program ordered by referral count in ascending order.&#x20;

* **Monthly Referral Count Leaderboard**\
  \
  You can retrieve the program leaderboard ordered by the monthly referral count by providing a query parameter `leaderboardType` with a value of `CURRENT_MONTH`. This will retrieve a list of participants ordered by monthly referral count.\
  \
  Monthly referral counts are automatically reset at the end of each month for each participant within your program, therefore results of the monthly referral count may vary.<br>
* **Previous Monthly Referral Count Leaderboard**\
  \
  Similar to the monthly program leaderboard, providing a query parameter of `leaderboardType` with a value of `PREV_MONTH` will retrieve a list of participants order by the previous monthly referral count.\
  \
  Participants that did not exist within the program during the previous month will not be returned within the previous monthly leaderboard response.

#### Path Parameters

| Name                                 | Type   | Description           |
| ------------------------------------ | ------ | --------------------- |
| id<mark style="color:red;">\*</mark> | string | The ID of the program |

#### Query Parameters

| Name            | Type    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| nextId          | string  | <p>(Optional)<br><br>The ID of the participant to start the next result set with. This can be used to skip through the list or to page the list of results. Each response will provide a <code>nextId</code> value if there are more participants otherwise, <code>nextId</code> will be <code>null</code>.</p>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| limit           | string  | <p>(Optional)<br><br>The number of participants to return. Must be a value less than or equal to 100 and greater than 1. 100 is currently the maximum limit per reach request.</p>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| isMonthly       | boolean | <p>(Optional)<br><br>If true will return the leaderboard for monthly referral counts. Default is <code>false</code>.<br><br><strong>Deprecated Notice:</strong><br><br>This currently works but will be removed in future API versions. <strong>Please use <code>leaderboardType</code></strong> <strong>instead</strong>.</p>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| leaderboardType | string  | <p>Returns the leaderboard for the specified type if provided.<br><br><strong>Options</strong><br><code>ALL\_TIME</code> - Returns the all-time leaderboard, based on all-time referral counts. <em>Default</em><br><br><code>CURRENT\_MONTH</code> -  Returns the current month's leaderboard, based on the current month's referral counts.<br><br><code>PREV\_MONTH</code> - Returns the previous month's leaderboard, based on the previous month's referral counts (With this option, participants that did not exist within the program during the previous month will not be returned).</p><p></p><p><code>TOTAL\_IMPRESSION\_COUNT</code> - Returns the leaderboard based on all-time total impression counts.</p><p></p><p><code>UNIQUE\_IMPRESSION\_COUNT</code> - Returns the leaderboard based on all-time unique impression counts.<br></p><p><code>BY\_COMMISSIONS</code> - \[Only applies to affiliate programs] Returns the leaderboard based on all-time total commission amount earned.</p><p><br><code>BY\_REVENUE</code> - \[Only applies to affiliate programs] Returns the leaderboard based on all-time total revenue amount driven.</p><p><br><code>BY\_REFERRALS</code> - \[Only applies to affiliate programs] Returns the leaderboard based on total all-time referrals (qualified/converted referrals).<br></p><p><br><br><br><code>BY\_LEADS</code> - \[Only applies to affiliate programs] Returns the leaderboard based on total all-time leads (pending referrals)</p> |

#### Response

{% tabs %}
{% tab title="200" %}
Example response of the standard leaderboard with returned participants order by their referral count.

If the `leaderboardType=CURRENT_MONTH` query parameter is provided, the resulting list would be ordered by monthly referral count.

Similarly, if `leaderboardType=PREV_MONTH` is provided, the resulting list would be ordered by the previous monthly referral count.

```json
{
    "participants": [
         {
            "id": "3vxff9",
            "firstName": "Gavin",
            "lastName": "Belson",
            "referralCount": 1000,
            "monthlyReferralCount": 10,
            "prevMonthlyReferralCount": 990,
            "rank": 1,
            "monthlyRank": 10,
            "prevMonthlyRank": 10,
            "shareUrl": "https://hoolie.com?grsf=gavin-3vxff9",
            "rewards": [],
            "email": "gavin@hooli.com",
            "createdAt": 1558665537426,
            "fraudRiskLevel": "LOW",
            "fraudReasonCode": "UNIQUE_IDENTIY",            
            "referralSource": "DIRECT",
            "isWinner": false,
            "shareCount": {
                "email": 0,
                "facebook": 0,
                "linkedin": 0,
                "pinterest": 0,
                "twitter": 0
            },
            "impressionCount": 0,
            "uniqueImpressionCount": 0,            
            "inviteCount": 0,                        
            "referrals": [],
            "referrer": null,
            "ipAddress": "127.0.0.1",
            "fingerprint": "cfb163bd47ba666c52cb932c521e47f4",
            "metadata": {},
            "unsubscribed": false,
            "rewards": [],
            "vanityKeys": [
                "gavin-3vxff9"
            ]
        },
        {
            "id": "f8g9nl",
            "firstName": "Gavin",
            "lastName": "Belson",
            "referralCount": 900,
            "monthlyReferralCount": 9,
            "prevMonthlyReferralCount": 800,
            "rank": 2,
            "monthlyRank": 11,
            "prevMonthlyRank": 20,
            "shareUrl": "https://piedpiper.com?grsf=gavin-f8g9nl",
            "email": "gavin@hoolie.com",
            "createdAt": 1552404738928,
            "fraudRiskLevel": "LOW",
            "fraudReasonCode": "UNIQUE_IDENTIY",            
            "isWinner": true,
            "shareCount": {
                "email": 10,
                "facebook": 1,
                "pinterest": 1,
                "twitter": 11
            },
            "impressionCount": 2,
            "uniqueImpressionCount": 2,            
            "inviteCount": 2,                                    
            "referrals": [
                "i9g2bh",
                "xua4sq"
            ],
            "referralSource": "PARTICIPANT",
            "referralStatus": "CREDIT_AWARDED",
            "referrer": {
                "id": "h8kp6l",
                "firstName": "Richard",
                "lastName": "Hendricks",
                "referralCount": 5,
                "monthlyReferralCount": 0,
                "prevMonthlyReferralCount": 0,
                "rank": 100,
                "monthlyRank": 100,
                "prevMonthlyRank": 99,
                "shareUrl": "https://piedpiper.com?grsf=h8kp6l",
                "email": "richard@piedpiper.com",
                "createdAt": 1552402661449,
                "referralSource": "DIRECT",
                "fraudRiskLevel": "LOW",
                "fraudReasonCode": "UNIQUE_IDENTIY",
                "isWinner": true,
                "shareCount": {
                    "email": 20,
                    "facebook": 11,
                    "linkedin": 0,
                    "pinterest": 3,
                    "twitter": 12
                },
                "impressionCount": 14,
                "uniqueImpressionCount": 14,            
                "inviteCount": 14,
                "ipAddress": "148.3.3.1",
                "fingerprint": "p33a71bd661c547ba1ca933d997f51e9",
                "metadata": {},
                "unsubscribed": false,
                "referrals": [
                    "0dveu7",
                    "f8g9nl",
                    "j0hbym",
                    "m5xm9l",
                    "w01fil"
                ]
            },
            "ipAddress": "113.2.2.9",
            "fingerprint": "dau221bd47ba661c51ca933d531e47f5",
            "metadata": {},
            "unsubscribed": false,
            "rewards": [],
            "vanityKeys": [
                "gavin-f8g9nl"
            ]     
        }
    ],
    "limit": 2,
    "nextId": "1u7v0q"
}
```

{% endtab %}
{% endtabs %}

### Add Participant

<mark style="color:green;">`POST`</mark> `https://api.growsurf.com/v2/campaign/:id/participant`

Adds a new participant to the program. This includes both referrers and referred friends.

If the participant with the same email address already exists, then the existing participant will be returned.

{% hint style="info" %}
**Tips**:

* The only required field is `email`. Make sure to pass in `referredBy` if it is available.
* Though they are optional, we recommend passing in the fields `ipAddress`, `fingerprint`, `firstName`, and `lastName`. These fields are used for anti-fraud purposes and the referrer's name shows up in referred friend motivator elements, if enabled.
  {% endhint %}

#### Path Parameters

| Name                                 | Type   | Description                                         |
| ------------------------------------ | ------ | --------------------------------------------------- |
| id<mark style="color:red;">\*</mark> | string | The ID of the program to add the new participant to |

#### Request Body

| Name                                    | Type   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| email<mark style="color:red;">\*</mark> | string | The email address of the new participant                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| referredBy                              | string | <p>(Optional)<br><br>Set a referrer for this participant by providing the referrer's unique ID or email.<br><br>To get the referrer's unique ID, you can call <a href="https://docs.growsurf.com/integrate/javascript-web-api/api-reference#get-referrer-id"><code>growsurf.getReferrerId()</code></a> from the front-end.</p>                                                                                                                                                                                                                                         |
| referralStatus                          | string | <p>(Optional)<br><br>Set the referral credit status of this new participant's referrer to <code>CREDIT\_PENDING</code> or <code>CREDIT\_AWARDED</code> . If a <code>referredBy</code> value is provided, the default value will be set to <code>CREDIT\_AWARDED</code> unless another <code>referralStatus</code> value is specified.<br><br>To award referral credit immediately to the referrer, set this <code>referralStatus</code> value to <code>CREDIT\_AWARDED</code>, otherwise it will be set based on the referral trigger configured for your program.</p> |
| firstName                               | string | <p>(Optional, but recommended)<br><br>The first name of the new participant. If provided, this property will be used for anti-fraud measurements.</p>                                                                                                                                                                                                                                                                                                                                                                                                                  |
| lastName                                | string | <p>(Optional, but recommended)</p><p><br>The last name of the new participant. If provided, this property will be used for anti-fraud measurements.</p>                                                                                                                                                                                                                                                                                                                                                                                                                |
| ipAddress                               | string | <p>(Optional, but recommended)<br><br>The IP address of the new participant. If provided, this property will be used for anti-fraud measurements.</p>                                                                                                                                                                                                                                                                                                                                                                                                                  |
| fingerprint                             | string | <p>(Optional, but recommended) <br><br>The browser fingerprint of the new participant. If provided, this property will be used for anti-fraud measurements.<br><br>We recommend using a front-end library like <a href="https://github.com/fingerprintjs/fingerprintjs">fingerprintjs</a> to get the fingerprint value. Example value: <code>cfb163bd47ba666c52cb932c521e47f4</code>.</p>                                                                                                                                                                              |
| metadata                                | object | <p>(Optional)<br><br>A shallow Object containing custom key/values to include with the participant data. </p><p></p><p>The following keys are restricted: <code>gdprAgreements</code></p>                                                                                                                                                                                                                                                                                                                                                                              |

#### Request Examples

{% tabs %}
{% tab title="cURL" %}
Here are example `cURL` commands you can use to call this API endpoint. Remember to replace `YOUR_PROGRAM_ID` with your program ID, `gavin@hooli.com` with the email address of the new participant you're adding, and `YOUR_API_KEY` with your API key.

We pass in `firstName`, `lastName`, `ipAddress` and `fingerprint` for anti-fraud purposes. `metadata` is used to save any custom data that can be retrieved later.

```bash
curl -X POST "https://api.growsurf.com/v2/campaign/YOUR_PROGRAM_ID/participant" \
-H "Authorization: Bearer YOUR_API_KEY" \
-H "Content-Type: application/json" \
-d '{
   "email": "gavin@hooli.com",
   "firstName": "Gavin",
   "lastName": "Belson",
   "ipAddress": "203.0.113.10",
   "metadata": {
      "companyName": "Hooli",
      "industry": "Software"
   }
}'
```

If you want to add a new referred participant, make sure to pass in `referredBy`.

```bash
curl -X POST "https://api.growsurf.com/v2/campaign/YOUR_PROGRAM_ID/participant" \
-H "Authorization: Bearer YOUR_API_KEY" \
-H "Content-Type: application/json" \
-d '{
   "email": "gavin@hooli.com",
   "firstName": "Gavin",
   "lastName": "Belson",
   "ipAddress": "203.0.113.10",
   "metadata": {
      "companyName": "Hooli",
      "industry": "Software"
   },
   "referredBy": "richard-h8kp6l"   
}'
```

{% endtab %}
{% endtabs %}

#### Response

{% tabs %}
{% tab title="200" %}
Returns the participant object that was added to the program.

```json
{
    "id": "3vxff9",
    "firstName": "Gavin",
    "lastName": "Belson",
    "referralCount": 0,
    "monthlyReferralCount": 0,
    "prevMonthlyReferralCount": 0,
    "rank": 10001,
    "monthlyRank": 10001,
    "shareUrl": "https://hoolie.com?grsf=3vxff9",
    "rewards": [],
    "email": "gavin@hooli.com",
    "createdAt": 1558665537426,
    "referralSource": "DIRECT",
    "isWinner": false,
    "shareCount": {
        "email": 0,
        "facebook": 0,
        "linkedin": 0,
        "pinterest": 0,
        "twitter": 0
    },
    "impressionCount": 0,
    "uniqueImpressionCount": 0,    
    "inviteCount": 0,
    "referrals": [],
    "monthlyReferrals": [],
    "referrer": null,
    "metadata": {
       "company": "Hooli, Inc",
       "companySize": 10000
    },
    "fraudRiskLevel": "LOW",
    "fraudReasonCode": "UNIQUE_IDENTITY",
    "ipAddress": "127.0.0.1",
    "fingerprint": "cfb163bd47ba666c52cb932c521e47f4",
    "unsubscribed": false,
    "vanityKeys": [
        "gavin-f8g9nl"
    ]

```

{% endtab %}

{% tab title="400" %}
A `400` will be returned if validation fails on an input.

```json
{
  "name": "BadRequestError",
  "code": "BAD_REQUEST_ERROR",
  "message": "Invalid email foo",
  "errors": […],
  "status": 400,
  "supportUrl": "https://app.growsurf.com/settings#contact_support"
}
```

{% endtab %}

{% tab title="409" %}
A `409` error will be returned if the request is a duplicate.

```json
{
  "name": "DuplicateRequestError",
  "code": "DUPLICATE_REQUEST_ERROR",
  "message": "Duplicate request is already in progress.",
  "status": 409,
  "supportUrl": "https://app.loyaltysurf.io/settings#contact_support"
}
```

{% endtab %}

{% tab title="422" %}
If the new participant is detected to be a high-level fraudster, and if anti-fraud settings are configured on the program, the participant will be blocked from joining with a status code of `422`.

View the list of available `fraudRiskLevel` and `fraudReasonCode` options on the [Participant](https://docs.growsurf.com/developer-tools/rest-api/api-objects#participant) Object. `matchedParticipantIds` will contain a list of matching fraudsters, but will be empty if an antifraud blacklist rule gets a match first.

```json
{
  "name": "ParticipantBlockedError",
  "code": "PARTICIPANT_BLOCKED_ERROR",
  "message": "Participant sarah.smith@email.com is blocked by antifraud rules.",
  "status": 422,
  "supportUrl": "https://app.growsurf.com/settings#contact_support",
  "fraudRiskLevel": "HIGH",
  "fraudReasonCode": "REFERRAL_VELOCITY_FRAUD",
  "matchedParticipantIds": ["abc123", "def456"],
  "email": "sarah.smith@email.com",
  "referrerId": "abc123",
  "ipAddress": "203.0.113.10",
  "fingerprint": null,
  "blockedAt": "2025-11-13T06:22:31.001Z"
}
```

{% endtab %}
{% endtabs %}

{% hint style="warning" %}
**Metadata:** Please see our [API Guidelines ](https://docs.growsurf.com/developer-tools/api-guidelines#metadata)for more information about `metadata.`
{% endhint %}

{% hint style="info" %}
† [**What's a program referral trigger**](https://growsurf.freshdesk.com/support/solutions/articles/42000052432-what-triggers-a-referral-)?

You can update the program referral trigger in the *Installation* step of the *Program Editor* ([see image](https://growsurf-blog.s3.amazonaws.com/help-center/qualifying-action.png)). Depending on what you select, the API will automatically set a default value for the participant:

* If the referral trigger is *Sign up + Qualifying Action*, then `referralStatus` will default to `CREDIT_PENDING`
* If the referral trigger is *Sign Up*, then `referralStatus` will default to `CREDIT_AWARDED`
  {% endhint %}

### Trigger Referral by Participant ID

<mark style="color:green;">`POST`</mark> `https://api.growsurf.com/v2/campaign/:id/participant/:participantId/ref`

Triggers a referral using an existing referred participant's ID, awarding referral credit to their referrer.

#### Path Parameters

| Name                                            | Type   | Description                        |
| ----------------------------------------------- | ------ | ---------------------------------- |
| id<mark style="color:red;">\*</mark>            | string | The ID of the program              |
| participantId<mark style="color:red;">\*</mark> | string | The ID of the referred participant |

#### Response

{% tabs %}
{% tab title="200" %}
Returns an object with a `success` attribute equal to `true` if referral credit was awarded, otherwise `false`.

```json
{
    "success": true,
    "message": "Successfully awarded referral credit."
}
```

If referral credit has already been awarded, success will be `false` and the message will be `"Referral credit has already been awarded"`.

```json
{
    "success": false,
    "message": "Referral credit has already been awarded"
}
```

\
If the participant was not referred, `success` will be `false` and the message will be "`Participant was not referred"`.

```json
{
    "success": false,
    "message": "Participant was not referred"
}
```

{% endtab %}
{% endtabs %}

{% hint style="warning" %}
**Important Notes:**

* Referral credit will only be awarded to the referrer if the participant `referralStatus` has a value of `CREDIT_PENDING`
* Make sure your referral program's referral trigger is set to *Sign Up + Qualifying Action* ([see image](https://growsurf-blog.s3.amazonaws.com/help-center/qualifying-action.png)). If the referral trigger is set to *Sign Up Event*, triggering referrals will not work since referral credit has already been provided.
* If your program has a [referral credit expiration window](https://support.growsurf.com/article/278-what-is-the-referral-credit-expiration-window) set up, triggering a referral will still return a successful response even if the threshold has been exceeded, but the referrer will not receive credit and no rewards will be unlocked.
* Responses do not contain errors or error status codes so that the endpoint can be invoked without needing to know the current state of the participant. Please make sure to check the values within the response body.
  {% endhint %}

### Trigger Referral by Participant Email

<mark style="color:green;">`POST`</mark> `https://api.growsurf.com/v2/campaign/:id/participant/:participantEmail/ref`

Triggers a referral using an existing referred participant's email address, awarding referral credit to their referrer.

#### Path Parameters

| Name                                               | Type   | Description                                   |
| -------------------------------------------------- | ------ | --------------------------------------------- |
| id<mark style="color:red;">\*</mark>               | string | The ID of the program                         |
| participantEmail<mark style="color:red;">\*</mark> | string | The email address of the referred participant |

#### Response

{% tabs %}
{% tab title="200" %}
Returns an object with a `success` attribute equal to `true` if referral credit was awarded, otherwise `false`.

```json
{
    "success": true,
    "message": "Successfully awarded referral credit."
}
```

If referral credit has already been awarded, success will be `false` and the message will be `"Referral credit has already been awarded"`.

```json
{
    "success": false,
    "message": "Referral credit has already been awarded"
}
```

\
If the participant was not referred, `success` will be `false` and the message will be "`Participant was not referred"`.

```json
{
    "success": false,
    "message": "Participant was not referred"
}
```

{% endtab %}
{% endtabs %}

{% hint style="warning" %}
**Important Notes:**

* Referral credit will only be awarded to the referrer if the participant `referralStatus` has a value of `CREDIT_PENDING`
* Make sure your program's referral trigger is set to *Sign Up + Qualifying Action* ([see image](https://growsurf-blog.s3.amazonaws.com/help-center/qualifying-action.png)). If the referral trigger is set to *Sign Up*, triggering referrals will not work since referral credit has already been provided.
* If your referral program has a [referral credit expiration window](https://support.growsurf.com/article/278-what-is-the-referral-credit-expiration-window) set up, triggering a referral will still return a successful response even if the threshold has been exceeded, but the referrer will not receive credit and no rewards will be unlocked.
* Responses do not contain errors or error status codes so that the endpoint can be invoked without needing to know the current state of the participant. Please make sure to check the values within the response body.
  {% endhint %}

### Update Participant by ID

<mark style="color:green;">`POST`</mark> `https://api.growsurf.com/v2/campaign/:id/participant/:participantId`

Updates a participant within the program using the ID of the participant.

This endpoint is useful for use-cases like updating the participant's information (email address, first name, etc.) or assigning the participant a referrer by setting `{ referredBy, referralStatus }`. Although you can use this endpoint to trigger referral credit for the participant's referrer by setting `{ referredBy, referralStatus }`, we recommend using the [`/POST Trigger Referral by Participant ID`](https://docs.growsurf.com/developer-tools/rest-api/api-reference#trigger-referral-by-participant-id) endpoint for triggering referrals.

#### Path Parameters

| Name                                            | Type   | Description               |
| ----------------------------------------------- | ------ | ------------------------- |
| id<mark style="color:red;">\*</mark>            | string | The ID of the program     |
| participantId<mark style="color:red;">\*</mark> | string | The ID of the participant |

#### Request Body

| Name           | Type    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| referredBy     | string  | <p>(Optional)<br><br>Set a referrer for this participant by providing the referrer's unique ID or email.<br><br>If provided and a referrer has already been assigned, the referrer will not be updated and a error response will be returned.</p>                                                                                                                                                                                                                                                                                                                                                             |
| email          | string  | <p>(Optional)<br><br>The new email to assign to this participant.<br><br>If the given email is already assigned to another participant within the program, an error response will be returned.</p>                                                                                                                                                                                                                                                                                                                                                                                                            |
| firstName      | string  | <p>(Optional)<br><br>The first name of the participant.</p>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| lastName       | string  | <p>(Optional)<br><br>The last name of the participant</p>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| metadata       | object  | <p>(Optional)<br><br>A shallow Object containing custom values to include in the participant data.<br><br>If any existing metadata exists for the participant, any new values provided will be appended to the existing metadata, any existing values provided will overwrite and replace the existing metadata.\*<br><br>To remove any existing metadata set its value to <code>null</code>. </p>                                                                                                                                                                                                            |
| referralStatus | string  | <p>(Optional)<br><br>Set the referral status of this participant's referrer to <code>CREDIT\_PENDING</code> , <code>CREDIT\_AWARDED</code>, or <code>CREDIT\_EXPIRED</code>. <br><br>If provided and the referral status has already been awarded (<code>CREDIT\_AWARDED</code>) the status cannot be updated and an error response will be returned.</p>                                                                                                                                                                                                                                                     |
| vanityKeys     | array   | <p>(Optional)<br><br>A list containing <a href="https://support.growsurf.com/article/394-how-to-set-up-vanity-links">vanity IDs</a> of the participant. This is useful for personalizing referral links for the participant.</p><p><br><strong>The following rules apply:</strong><br><br>- <code>vanityKeys</code> must be an array with no more than 5 vanity IDs.<br>- Vanity IDs must be between 1-20 characters.<br>- Vanity IDs can only contain numbers, letters, underscores, and hyphens.<br>- Vanity IDs must be unique and cannot be identical to another participant's GrowSurf or vanity ID.</p> |
| unsubscribed   | boolean | <p>(Optional)<br><br>The participant's unsubscribed status. If <code>true</code>, they will not receive any program emails.</p>                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

#### Response

{% tabs %}
{% tab title="200" %}
Returns the updated participant object.

```json
{
    "id": "f8g9nl",
    "firstName": "Gavin",
    "lastName": "Belson",
    "referralCount": 2,
    "monthlyReferralCount": 2,
    "prevMonthlyReferralCount": 0,
    "rank": 10001,
    "monthlyRank": 10001,
    "shareUrl": "https://piedpiper.com?grsf=f8g9nl",
    "email": "gavin@hoolie.com",
    "createdAt": 1552404738928,
    "fraudRiskLevel": "LOW",
    "fraudReasonCode": "UNIQUE_IDENTIY",
    "isWinner": true,
    "shareCount": {
        "email": 10,
        "facebook": 1,
        "pinterest": 1,
        "twitter": 11
    },
    "impressionCount": 2,
    "uniqueImpressionCount": 2,
    "inviteCount": 2,
    "referrals": [
        "i9g2bh",
        "xua4sq"
    ],
    "monthlyReferrals": [
        "i9g2bh",
        "xua4sq"
    ],    
    "referralSource": "PARTICIPANT",
    "referralStatus": "CREDIT_AWARDED",
    "referrer": {
        "id": "h8kp6l",
        "firstName": "Richard",
        "lastName": "Hendricks",
        "referralCount": 5,
        "monthlyReferralCount": 2,      
        "rank": 100,
        "shareUrl": "https://piedpiper.com?grsf=h8kp6l",
        "email": "richard@piedpiper.com",
        "createdAt": 1552402661449,
        "referralSource": "DIRECT",
        "fraudRiskLevel": "LOW",
        "fraudReasonCode": "UNIQUE_IDENTIY",
        "isWinner": true,
        "shareCount": {
            "email": 20,
            "facebook": 11,
            "linkedin": 0,
            "pinterest": 3,
            "twitter": 12
        },
        "impressionCount": 14,
        "uniqueImpressionCount": 11,
        "inviteCount": 11,
        "referrals": [
            "0dveu7",
            "f8g9nl",
            "j0hbym",
            "m5xm9l",
            "w01fil"
        ],
        "monthlyReferrals": [
            "m5xm9l",
            "w01fil"
        ],
        "ipAddress": "113.2.2.9",
        "fingerprint": "dau221bd47ba661c51ca933d531e47f5",
        "metadata": {}
    },
    "ipAddress": "127.0.0.1",
    "fingerprint": "cfb163bd47ba666c52cb932c521e47f4",
    "metadata": {
       "company": "Hooli, Inc",
       "companySize": 10000
    },
    "unsubscribed": false,
    "rewards": [
        {
            "id": "prew_dgaiuk",
            "rewardId": "crew_oe1cjt",
            "status": "PENDING",
            "unread": true,
            "isReferrer": true,
            "isAvailable": false,
            "approved": false,
            "isFulfilled": false,
            "referredId": "xh345d",
            "referrerId": "f8g9nl"
        }
    ],
    "vanityKeys": [
        "gavin-f8g9nl"
    ]
}
```

{% endtab %}
{% endtabs %}

{% hint style="warning" %}
**\***&#x50;lease see our [API Guidelines ](https://docs.growsurf.com/developer-tools/api-guidelines#metadata)for more information about `metadata.`
{% endhint %}

### Update Participant by Email

<mark style="color:green;">`POST`</mark> `https://api.growsurf.com/v2/campaign/:id/participant/:participantEmail`

Updates a participant within the program using the email address of the participant.

**Note:** This endpoint is useful for use-cases like updating the participant's information (email address, first name, etc.) or assigning the participant a referrer by setting `{ referredBy, referralStatus }`. Although you can use this endpoint to trigger referral credit for the participant's referrer by setting `{ referredBy, referralStatus }`, we recommend using the [`/POST Trigger Referral by Participant Email`](https://docs.growsurf.com/developer-tools/rest-api/api-reference#trigger-referral-by-participant-email) endpoint for triggering referrals.

#### Path Parameters

| Name                                               | Type   | Description           |
| -------------------------------------------------- | ------ | --------------------- |
| id<mark style="color:red;">\*</mark>               | string | The program ID        |
| participantEmail<mark style="color:red;">\*</mark> | string | The participant email |

#### Request Body

| Name           | Type    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| referredBy     | string  | <p>(Optional)<br><br>Set a referrer for this participant by providing the referrer's unique ID or email.<br><br>If provided and a referrer has already been assigned, the referrer will not be updated and a error response will be returned.</p>                                                                                                                                                                                                                                                                                                                                        |
| email          | string  | <p>(Optional)<br><br>The new email to assign to the participant.<br><br>If the given email is already assigned to another participant within the program, an error response will be returned. </p>                                                                                                                                                                                                                                                                                                                                                                                       |
| firstName      | string  | <p>(Optional)<br><br>The first name of the participant</p>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| lastName       | string  | <p>(Optional)<br><br>The last name of the participant</p>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| metadata       | object  | <p>(Optional)<br><br>A shallow Object containing custom values to include in the participant data.<br><br>If any existing metadata exists for the  participant, any new values provided will be appended to the existing participant metadata, any existing values provided will  overwrite and replace the existing metadata.\*<br><br>To remove existing metadata set its value to <code>null</code>.</p>                                                                                                                                                                              |
| referralStatus | string  | <p>(Optional)<br><br>Set the referral status of this participant's referrer to <code>CREDIT\_PENDING</code>, <code>CREDIT\_AWARDED</code>, or <code>CREDIT\_EXPIRED</code>.<br><br>If provided and the referral status has already been awarded (<code>CREDIT\_AWARDED</code>) the status cannot be updated and an error response will be returned.</p>                                                                                                                                                                                                                                  |
| vanityKeys     | array   | <p>(Optional)<br><br>A list containing <a href="https://support.growsurf.com/article/394-how-to-set-up-vanity-links">vanity IDs</a> of the participant. This is useful for personalizing referral links for the participant.</p><p><br>The following rules apply:<br>- <code>vanityKeys</code> must be an array with no more than 5 vanity IDs.<br>- Vanity IDs must be between 1-20 characters.<br>- Vanity IDs can only contain numbers, letters, underscores, and hyphens.<br>- Vanity IDs must be unique and cannot be identical to another participant's GrowSurf or vanity ID.</p> |
| unsubscribed   | boolean | <p>(Optional)<br><br>The participant's unsubscribed status. If <code>true</code>, they will not receive any program emails.</p>                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

#### Response

{% tabs %}
{% tab title="200" %}
Returns the updated participant object.

```json
{
    "id": "f8g9nl",
    "firstName": "Gavin",
    "lastName": "Belson",
    "referralCount": 2,
    "monthlyReferralCount": 2,
    "prevMonthlyReferralCount": 0,
    "rank": 10001,
    "monthlyRank": 10001,
    "shareUrl": "https://piedpiper.com?grsf=f8g9nl",
    "email": "gavin@hoolie.com",
    "createdAt": 1552404738928,
    "fraudRiskLevel": "LOW",
    "fraudReasonCode": "UNIQUE_IDENTIY",
    "isWinner": true,
    "shareCount": {
        "email": 10,
        "facebook": 1,
        "pinterest": 1,
        "twitter": 11
    },
    "impressionCount": 2,
    "uniqueImpressionCount": 2,
    "inviteCount": 2,    
    "referrals": [
        "i9g2bh",
        "xua4sq"
    ],
    "monthlyReferrals": [
        "i9g2bh",
        "xua4sq"
    ],    
    "referralSource": "PARTICIPANT",
    "referralStatus": "CREDIT_AWARDED",
    "referrer": {
        "id": "h8kp6l",
        "firstName": "Richard",
        "lastName": "Hendricks",
        "referralCount": 5,
        "monthlyReferralCount": 2,      
        "rank": 100,
        "shareUrl": "https://piedpiper.com?grsf=h8kp6l",
        "email": "richard@piedpiper.com",
        "createdAt": 1552402661449,
        "referralSource": "DIRECT",
        "fraudRiskLevel": "LOW",
        "fraudReasonCode": "UNIQUE_IDENTIY",
        "isWinner": true,
        "shareCount": {
            "email": 20,
            "facebook": 11,
            "linkedin": 0,
            "pinterest": 3,
            "twitter": 12
        },
        "impressionCount": 14,
        "uniqueImpressionCount": 11,
        "inviteCount" 11,
        "referrals": [
            "0dveu7",
            "f8g9nl",
            "j0hbym",
            "m5xm9l",
            "w01fil"
        ],
        "monthlyReferrals": [
            "m5xm9l",
            "w01fil"
        ],
        "ipAddress": "113.2.2.9",
        "fingerprint": "dau221bd47ba661c51ca933d531e47f5",
        "metadata": {},
        "unsubscribed": false,
    },
    "ipAddress": "127.0.0.1",
    "fingerprint": "cfb163bd47ba666c52cb932c521e47f4",    
    "metadata": {
       "company": "Hooli, Inc",
       "companySize": 10000
    },
    "unsubscribed": false,
    "rewards": [
        {
            "id": "prew_dgaiuk",
            "rewardId": "crew_oe1cjt",
            "status": "PENDING",
            "unread": true,
            "isReferrer": true,
            "isAvailable": false,
            "approved": false,
            "isFulfilled": false,
            "referredId": "xh345d",
            "referrerId": "f8g9nl"
        }
    ],
    "vanityKeys": [
        "gavin-f8g9nl"
    ]
}
```

{% endtab %}
{% endtabs %}

{% hint style="warning" %}
**\***&#x50;lease see our [API Guidelines ](https://docs.growsurf.com/developer-tools/api-guidelines#metadata)for more information about `metadata.`
{% endhint %}

### Remove Participant by ID

<mark style="color:red;">`DELETE`</mark> `https://api.growsurf.com/v2/campaign/:id/participant/:participantId`

Removes a participant within the program using the ID of the participant.

(Looking to remove a bulk list of participants using a CSV file? [View this tutorial](https://docs.growsurf.com/developer-tools/rest-api/tutorials#example-4-delete-a-list-of-participants)).

#### Path Parameters

| Name                                            | Type   | Description               |
| ----------------------------------------------- | ------ | ------------------------- |
| id<mark style="color:red;">\*</mark>            | string | The ID of the program     |
| participantId<mark style="color:red;">\*</mark> | string | The ID of the participant |

#### Response

{% tabs %}
{% tab title="200" %}
Returns a success response.

```json
{
    "success": true
}
```

{% endtab %}
{% endtabs %}

### Remove Participant by Email

<mark style="color:red;">`DELETE`</mark> `https://api.growsurf.com/v2/campaign/:id/participant/:participantEmail`

Removes a participant within the program using the email address of the participant.

(Looking to remove a bulk list of participants using a CSV file? [View this tutorial](https://docs.growsurf.com/developer-tools/rest-api/tutorials#example-4-delete-a-list-of-participants)).

#### Path Parameters

| Name                                               | Type   | Description           |
| -------------------------------------------------- | ------ | --------------------- |
| id<mark style="color:red;">\*</mark>               | string | The program ID        |
| participantEmail<mark style="color:red;">\*</mark> | string | The participant email |

#### Response

{% tabs %}
{% tab title="200" %}
Returns a success response.

```json
{
    "success": true
}
```

{% endtab %}
{% endtabs %}

***

## PARTICIPANT REWARDS ↓

### Get Participant Rewards by Participant ID

<mark style="color:blue;">`GET`</mark> `https://api.growsurf.com/v2/campaign/:id/participant/:participantId/rewards`

Retrieves a list of rewards earned by a participant.

#### Path Parameters

| Name                                            | Type   | Description                          |
| ----------------------------------------------- | ------ | ------------------------------------ |
| id<mark style="color:red;">\*</mark>            | string | The ID of the program                |
| participantId<mark style="color:red;">\*</mark> | string | The participant's unique ID or email |

#### Query Parameters

| Name   | Type   | Description                                                                                                                                                                                                                                                                                                          |
| ------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| nextId | string | <p>(Optional)<br><br>The ID of the participant reward to start the next result set with. This can be used to skip through the list or to page the list of results. Each response will provide a <code>nextId</code> value if there are more rewards otherwise the <code>nextId</code> will be <code>null</code>.</p> |
| limit  | string | <p>(Optional)<br><br>The number of rewards to return. Must be a value less than or equal to 100, which is currently the maximum allowed per request.</p>                                                                                                                                                             |

#### Response

{% tabs %}
{% tab title="200" %}
In this example we are showing two rewards earned by the participant.\
\
`isReferrer` will be `true` if the participant earned the reward by referring another participant.\
\
`status` will be `"PENDING"` if the reward has not yet been fulfilled, otherwise it will be `"FULFILLED"`.

`isAvailable` will be `true` if the reward has been approved either manually or automatically (depending on the program settings) and fulfilled, otherwise it will be set to `false`.\
\
`referredId` is the participant ID of the referred friend (this person caused the referral to be triggered by performing a qualifying action).\
\
`referrerId` is the participant ID of the referrer.

```json
{
    "limit": 2,
    "nextId": "prew_v2qtfq",
    "rewards": [
        {
            "id": "prew_rr35mg",
            "rewardId": "crew_c6w1qo",
            "status": "PENDING",
            "unread": true,
            "approved": false,
            "approvedAt": null,
            "fulfilledAt": null,            
            "isReferrer": true,
            "isAvailable": false,
            "isFulfilled": false,
            "referredId": "xh345d",
            "referrerId": "f8g9nl"
        },
        {
            "id": "prew_oltj0s",
            "rewardId": "crew_c6w1qo",
            "status": "FULFILLED",
            "unread": false,
            "approved": true,  
            "approvedAt": 1659453091744,
            "fulfilledAt": 1659453418901,     
            "isReferrer": false,
            "isAvailable": true,
            "isFulfilled": true,
            "referredId": "zyx765",
            "referrerId": "f8g9nl"
        }
    ]
}
```

{% endtab %}

{% tab title="400" %}
Error response returned if the `limit` query parameter that is provided exceeds the maximum allowed amount.

```json
{
    "name": "BadRequestError",
    "code": "BAD_REQUEST_ERROR",
    "message": "Invalid request. Request params are missing or are invalid",
    "status": 400,
    "supportUrl": "https://app.growsurf.com/settings#contact_support",
    "errors": [
        {
            "location": "query",
            "param": "limit",
            "value": "200",
            "msg": "Limit cannot be more than 101."
        }
    ],
    "level": "error",
    "timestamp": "2019-12-31T22:07:49.957Z"
}
```

{% endtab %}
{% endtabs %}

### Get Participant Rewards by Participant Email

<mark style="color:blue;">`GET`</mark> `https://api.growsurf.com/v2/campaign/:id/participant/:participantEmail/rewards`

Retrieves a list of rewards earned by a participant.

#### Path Parameters

| Name                                               | Type   | Description                          |
| -------------------------------------------------- | ------ | ------------------------------------ |
| id<mark style="color:red;">\*</mark>               | string | The ID of the program                |
| participantEmail<mark style="color:red;">\*</mark> | string | The email address of the participant |

#### Query Parameters

| Name   | Type   | Description                                                                                                                                                                                                                                                                                                          |
| ------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| nextId | string | <p>(Optional)<br><br>The ID of the participant reward to start the next result set with. This can be used to skip through the list or to page the list of results. Each response will provide a <code>nextId</code> value if there are more rewards otherwise the <code>nextId</code> will be <code>null</code>.</p> |
| limit  | string | <p>(Optional)<br><br>The number of rewards to return. Must be a value less than or equal to 100, which is currently the maximum allowed per request.</p>                                                                                                                                                             |

#### Response

{% tabs %}
{% tab title="200" %}
In this example we are showing two rewards earned by the participant.\
\
`isReferrer` will be `true` if the participant earned the reward by referring another participant.\
\
`status` will be `"PENDING"` if the reward has not yet been fulfilled, otherwise it will be `"FULFILLED"`.

`isAvailable` will be `true` if the reward has been approved either manually or automatically (depending on the program settings) and fulfilled, otherwise it will be set to `false`.\
\
`referredId` is the participant ID of the referred friend (this person caused the referral to be triggered by performing a qualifying action).\
\
`referrerId` is the participant ID of the referrer.

```json
{
    "limit": 2,
    "nextId": "prew_v2qtfq",
    "rewards": [
        {
            "id": "prew_rr35mg",
            "rewardId": "crew_c6w1qo",
            "status": "PENDING",
            "unread": true,
            "approved": false,      
            "approvedAt": null,
            "fulfilledAt": null,      
            "isReferrer": true,
            "isAvailable": false,
            "isFulfilled": false,
            "referredId": "xh345d",
            "referrerId": "f8g9nl"
        },
        {
            "id": "prew_oltj0s",
            "rewardId": "crew_c6w1qo",
            "status": "FULFILLED",
            "unread": false,
            "approved": true,    
            "approvedAt": 1659453091744,
            "fulfilledAt": 1659453418901,
            "isReferrer": false,
            "isAvailable": true,
            "isFulfilled": true,
            "referredId": "zyx765",
            "referrerId": "f8g9nl"
        }
    ]
}
```

{% endtab %}

{% tab title="400" %}
Error response returned if the `limit` query parameter that is provided exceeds the maximum allowed amount.

```json
{
    "name": "BadRequestError",
    "code": "BAD_REQUEST_ERROR",
    "message": "Invalid request. Request params are missing or are invalid",
    "status": 400,
    "supportUrl": "https://app.growsurf.com/settings#contact_support",
    "errors": [
        {
            "location": "query",
            "param": "limit",
            "value": "200",
            "msg": "Limit cannot be more than 100."
        }
    ],
    "level": "error",
    "timestamp": "2019-12-31T22:07:49.957Z"
}
```

{% endtab %}
{% endtabs %}

### Approve Participant Reward

<mark style="color:green;">`POST`</mark> `https://api.growsurf.com/v2/campaign/:id/reward/:rewardId/approve`

Approve a reward that was earned by a participant.\
\
You should only use this endpoint if your reward automation level is set to *Manually approve rewards* (learn more [here](https://support.growsurf.com/article/266-how-to-automate-rewards-fulfillment)). This means [`ParticipantRewards`](https://docs.growsurf.com/developer-tools/rest-api/api-objects#participantreward) will be generated with `status: "PENDING"`, `approved: false`, and `isFulfilled: false`.&#x20;

Calling this endpoint to approve a reward will cause *New Participant Reward* emails to be sent out and automations/integrations to be triggered. If you are using Webhooks to automate rewards, a new [`PARTICIPANT_REACHED_A_GOAL`](https://docs.growsurf.com/automate-rewards/webhooks/events-reference#participant_reached_a_goal)  event will be emitted with `data.reward.approved` as `false`.

#### Path Parameters

| Name                                       | Type   | Description                                 |
| ------------------------------------------ | ------ | ------------------------------------------- |
| id<mark style="color:red;">\*</mark>       | string | The program ID                              |
| rewardId<mark style="color:red;">\*</mark> | string | The ID of the participant reward to approve |

#### Request Body

| Name    | Type    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| fulfill | boolean | <p>(Optional)<br><br>Set <code>true</code> to mark the reward as fulfilled.</p><p></p><p>Fulfilling a reward does not trigger any emails or automations. It helps you stay organized when managing rewards from your GrowSurf admin dashboard (e.g, you won't see any red notifications reminding you to fulfill rewards -- see video <a href="https://support.growsurf.com/article/266-how-to-automate-rewards-fulfillment">here</a>).</p> |

#### Response

{% tabs %}
{% tab title="200" %}
Returns a success response.

```json
{
    "success": true
}
```

{% endtab %}

{% tab title="406" %}
Error response returned if a reward has already been approved for a participant.

```json
{
    "name": "InvalidRewardState",
    "code": "INVALID_REWARD_STATE",
    "message": "Invalid reward state. Reward has already been approved.",
    "status": 406,
    "supportUrl": "https://app.growsurf.com/settings#contact_support",
    "level": "error",
    "timestamp": "2019-10-13T16:43:05.902Z"
}
```

{% endtab %}
{% endtabs %}

### Fulfill Participant Reward

<mark style="color:green;">`POST`</mark> `https://api.growsurf.com/v2/campaign/:id/reward/:rewardId/fulfill`

Fulfill a reward that was earned by a participant (this can only be done if the reward is already approved). When you call this endpoint, the [`ParticipantReward`](https://docs.growsurf.com/developer-tools/rest-api/api-objects#participantreward) should have the following key-values: `status: "PENDING"`, `approved: true`, and `isFulfilled: false`.&#x20;

Fulfilling a reward does not trigger any emails or automations. It helps you stay organized when managing rewards from your GrowSurf admin dashboard (e.g, you won't see any red notifications reminding you to fulfill rewards -- see video [here](https://support.growsurf.com/article/266-how-to-automate-rewards-fulfillment)).

#### Path Parameters

| Name                                       | Type   | Description                                 |
| ------------------------------------------ | ------ | ------------------------------------------- |
| id<mark style="color:red;">\*</mark>       | string | The program ID                              |
| rewardId<mark style="color:red;">\*</mark> | string | The ID of the participant reward to fulfill |

#### Response

{% tabs %}
{% tab title="200" %}
Returns a success response.

```json
{
    "success": true
}
```

{% endtab %}

{% tab title="406" %}
Error response returned if a reward has not been approved or has already been fulfilled.

```json
{
    "name": "InvalidRewardState",
    "code": "INVALID_REWARD_STATE",
    "message": "Invalid reward state. Reward has already been fulfilled.",
    "status": 406,
    "supportUrl": "https://app.growsurf.com/settings#contact_support",
    "level": "error",
    "timestamp": "2019-10-13T16:43:05.902Z"
}
```

{% endtab %}
{% endtabs %}

#### Remove Participant Reward

<mark style="color:red;">`DELETE`</mark> `https://api.growsurf.com/v2/campaign/:id/reward/:rewardId`

Remove a reward that was earned by a participant.\
\
This only applies if your program was configured with manual reward approval and if the provided participant reward has not already been approved.

#### Path Parameters

| Name                                       | Type   | Description                                |
| ------------------------------------------ | ------ | ------------------------------------------ |
| id<mark style="color:red;">\*</mark>       | string | The program ID                             |
| rewardId<mark style="color:red;">\*</mark> | string | The ID of the participant reward to remove |

#### Response

{% tabs %}
{% tab title="200" %}
Returns a success response.

```json
{
    "success": true
}
```

{% endtab %}

{% tab title="406" %}
Error response returned if a reward has already been approved and thus cannot be deleted.

```json
{
    "name": "InvalidRewardState",
    "code": "INVALID_REWARD_STATE",
    "message": "Invalid reward state. This reward has already been approved and cannot be removed.",
    "status": 406,
    "supportUrl": "https://growsurf.com/settings#contact_support",
    "level": "error",
    "timestamp": "2019-10-17T16:43:05.902Z"
}
```

{% endtab %}
{% endtabs %}

***

## REFERRALS AND INVITES ↓

### Get Referrals and Invites

<mark style="color:blue;">`GET`</mark> `https://api.growsurf.com/v2/campaign/:id/referrals`

Retrieves a list of all referrals and email invites made by participants in a program.\
\
**Response Cache**\
In some cases, responses from this endpoint will be cached for up to but no longer than 5 minutes. Anytime a new referral or invite is triggered within your program that cache will be purged.

#### Path Parameters

| Name                                 | Type   | Description           |
| ------------------------------------ | ------ | --------------------- |
| id<mark style="color:red;">\*</mark> | string | The ID of the program |

#### Query Parameters

| Name           | Type    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| sortBy         | string  | <p>(Optional)<br><br>If provided, will sort the results by the provided field. Valid sortBy options are <code>updatedAt</code>, <code>createdAt</code>, <code>email</code>, <code>referralTriggeredAt</code>.<br><br>By default, results are sorted by the <code>updatedAt</code> timestamp in descending (most recent first) order.</p>                                                                                                                                       |
| desc           | boolean | <p>(Optional)<br><br>Defaults to <code>true</code>, returning results in descending (most recent first) order.  <br><br>Set <code>desc</code> to <code>false</code> to return results in ascending order.</p>                                                                                                                                                                                                                                                                  |
| limit          | number  | <p>(Optional)<br><br>Limit the number of referral results to return. <strong>Must be a value less than or equal to 100</strong> which is currently the maximum allowed per request.</p>                                                                                                                                                                                                                                                                                        |
| offset         | number  | <p>(Optional)<br><br>The offset number to start the result set at. This can be used to skip through the list or to page the list of results.</p>                                                                                                                                                                                                                                                                                                                               |
| email          | string  | <p>(Optional)<br><br>If provided, filters results by the given email value.<br>Any email value that is provided <strong>must be URL-encoded</strong>.<br><br><em>For data privacy and security purposes, invite (<code>INVITE\_SENT</code>) referral results cannot be filtered by email addresses.</em></p>                                                                                                                                                                   |
| firstName      | string  | <p>(Optional)<br><br>If provided, filters results by the given first name value</p>                                                                                                                                                                                                                                                                                                                                                                                            |
| lastName       | string  | <p>(Optional)<br><br>If provided, filters results by the given last name value </p>                                                                                                                                                                                                                                                                                                                                                                                            |
| referralStatus | string  | <p>(Optional)<br><br>If provided, filters results by the given referral status. Valid values for this filter are <code>CREDIT\_PENDING</code>, <code>CREDIT\_AWARDED</code>, <code>CREDIT\_EXPIRED</code>, <code>INVITE\_SENT</code><br><br>Any values other than the ones listed above will be ignored.</p>                                                                                                                                                                   |
| nextId         | string  | <p>(Optional)<br><br>The ID of the result to start the next result set with. This can be used to skip through the list or to page the list results. Each response will provide a <code>nextId</code> value, based on the provided <code>sortBy</code> value, if there are more results otherwise the <code>nextId</code> value will be <code>null</code>.</p><p></p><p>A boolean field <code>more</code> will always be present for determining if there are more results.</p> |

#### Response

{% tabs %}
{% tab title="200" %}
This is an example response for this endpoint. You will notice that invites are fully masked for data privacy and security purposes. Once the invite has been accepted and the invitee signs up or opts in as a participant for your program their email will be available.

```json
{
    "referrals": [{
            "id": "f2bukr",
            "email": "gavin@hooli.com",
            "firstName": "Gavin",
            "lastName": "Belson",
            "referralStatus": "CREDIT_AWARDED",
            "referredBy": "2khaha",
            "createdAt": 1591546112223,
            "updatedAt": 1591546285013
        },
        {
            "id": "qbp153",
            "email": "richard@piedpiper.com",
            "firstName": "Richard",
            "lastName": "Hendricks",
            "referralStatus": "CREDIT_PENDING",
            "referredBy": "abckj2",
            "createdAt": 1591542657835,
            "updatedAt": 1591542658457
        },
        {
            "id": "ghw131",
            "email": "danish@piedpiper.com",
            "firstName": "Danish",
            "lastName": "Chugtai",
            "referralStatus": "CREDIT_EXPIRED",
            "referredBy": "zz212f",
            "createdAt": 1591548886835,
            "updatedAt": 1591542677457
        },
        {
            "id": "ugqeq9",
            "email": "***************",
            "firstName": null,
            "lastName": null,
            "referralStatus": "INVITE_SENT",
            "referredBy": "xde212",
            "createdAt": 1591469527740,
            "updatedAt": 1591469527740
        }
    ],
    "limit": 4,
    "nextOffset": 4,
    "nextId": "g19s1b",
    "more": true
}
```

{% endtab %}
{% endtabs %}

### Get Participant Referrals and Invites by ID

<mark style="color:blue;">`GET`</mark> `https://api.growsurf.com/v2/campaign/:id/participant/:participantId/referrals`

Retrieves a list of all referrals and email invites made by a participant in a program.\
\
**Response Cache**\
In some cases responses from this endpoint will be cached for up to but no longer than 5 minutes. Anytime a new referral or invite is triggered within your program that cache will be purged.

#### Path Parameters

| Name                                            | Type   | Description         |
| ----------------------------------------------- | ------ | ------------------- |
| id<mark style="color:red;">\*</mark>            | string | The program ID      |
| participantId<mark style="color:red;">\*</mark> | string | ​The participant ID |

#### Query Parameters

| Name           | Type   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| sortBy         | string | <p>(Optional)<br><br>If provided, will sort results by the provided field.<br>Valid options are <code>updatedAt</code>, <code>createdAt</code>, <code>email</code>, <code>referralTriggeredAt</code>.<br><br>By default, the results are sorted by the <code>updatedAt</code> timestamp in descending (most recent first) order.</p>                                                                                                                                           |
| desc           | string | <p>(Optional)<br><br>Defaults to true, returning results in descending (most recent first) order.<br><br>Set <code>desc</code> to <code>false</code> to return results in ascending order.</p>                                                                                                                                                                                                                                                                                 |
| limit          | string | <p>(Optional)<br><br>Limit the number of referral results to return. <strong>Must be a value less than or equal to 100</strong> which is currently the maximum allowed per request.</p>                                                                                                                                                                                                                                                                                        |
| offset         | string | <p>(Optional)<br><br>The offset number to start the result set at. This can be used to skip the list or page the list of results.</p>                                                                                                                                                                                                                                                                                                                                          |
| email          | string | <p>(Optional)<br><br>If provided, filters results by the provided email value. Any email value that is provided <strong>must be URL encoded</strong>.<br><br><em>For data privacy and security purposes,  invite (<code>INVITE\_SENT</code>) referral results cannot be filtered by email addresses.</em></p>                                                                                                                                                                  |
| firstName      | string | <p>(Optional)<br><br>If provided, filters results by the given first name value</p>                                                                                                                                                                                                                                                                                                                                                                                            |
| lastName       | string | <p>(Optional)<br><br>If provided, filters results by the given last name value</p>                                                                                                                                                                                                                                                                                                                                                                                             |
| referralStatus | string | <p>(Optional)<br><br>If provided, filters results by the given referral status. Valid values for this filter are <code>CREDIT\_PENDING</code>, <code>CREDIT\_AWARDED</code>, <code>CREDIT\_EXPIRED</code>, <code>INVITE\_SENT</code>.<br><br>Any values other than the ones listed above will be ignored.</p>                                                                                                                                                                  |
| nextId         | string | <p>(Optional)<br><br>The ID of the result to start the next result set with. This can be used to skip through the list or to page the list results. Each response will provide a <code>nextId</code> value, based on the provided <code>sortBy</code> value, if there are more results otherwise the <code>nextId</code> value will be <code>null</code>.</p><p></p><p>A boolean field <code>more</code> will always be present for determining if there are more results.</p> |

#### Response

{% tabs %}
{% tab title="200" %}
This is an example response for this endpoint.

```json
{
    "referrals": [{
            "id": "f2bukr",
            "email": "gavin@hooli.com",
            "firstName": "Gavin",
            "lastName": "Belson",
            "referralStatus": "CREDIT_AWARDED",
            "referredBy": "2khaha",
            "createdAt": 1591546112223,
            "updatedAt": 1591546285013
        },
        {
            "id": "qbp153",
            "email": "richard@piedpiper.com",
            "firstName": "Richard",
            "lastName": "Hendricks",
            "referralStatus": "CREDIT_PENDING",
            "referredBy": "2khaha",
            "createdAt": 1591542657835,
            "updatedAt": 1591542658457
        },
        {
            "id": "ghw131",
            "email": "danish@piedpiper.com",
            "firstName": "Danish",
            "lastName": "Chugtai",
            "referralStatus": "CREDIT_EXPIRED",
            "referredBy": "2khaha",
            "createdAt": 1591548886835,
            "updatedAt": 1591542677457
        },
        {
            "id": "ugqeq9",
            "email": "***************",
            "firstName": null,
            "lastName": null,
            "referralStatus": "INVITE_SENT",
            "referredBy": "2khaha",
            "createdAt": 1591469527740,
            "updatedAt": 1591469527740
        }
    ],
    "limit": 4,
    "nextOffset": 4,
    "nextId": "gale@piedpiper.com",
    "more": true    
}
```

{% endtab %}
{% endtabs %}

### Get Participant Referrals and Invites by Email

<mark style="color:blue;">`GET`</mark> `https://api.growsurf.com/v2/campaign/:id/participant/:participantEmail/referrals`

Retrieves a list of all referrals and email invites made by a participant in a program.\
\
**Response Cache**\
In some cases responses from this endpoint will be cached for up to but no longer than 5 minutes. Anytime a new referral or invite is triggered within your program that cache will be purged.

#### Path Parameters

| Name                                               | Type   | Description                                                         |
| -------------------------------------------------- | ------ | ------------------------------------------------------------------- |
| id<mark style="color:red;">\*</mark>               | string | The program ID                                                      |
| participantEmail<mark style="color:red;">\*</mark> | string | ​The email address of the participant to retrieve the referrals for |

#### Query Parameters

| Name           | Type   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| sortBy         | string | <p>(Optional)<br><br>If provided, will sort results by the provided field.<br>Valid options are <code>updatedAt</code>, <code>createdAt</code>, <code>email</code>, <code>referralTriggeredAt</code>.<br><br>By default, the results are sorted by the <code>updatedAt</code> timestamp in descending (most recent first) order.</p>                                                                                                                                           |
| desc           | string | <p>(Optional)<br><br>Defaults to true, returning results in descending (most recent first) order.<br><br>Set <code>desc</code> to <code>false</code> to return results in ascending order.</p>                                                                                                                                                                                                                                                                                 |
| limit          | string | <p>(Optional)<br><br>Limit the number of referral results to return. <strong>Must be a value less than or equal to 100</strong> which is currently the maximum allowed per request.</p>                                                                                                                                                                                                                                                                                        |
| offset         | string | <p>(Optional)<br><br>The offset number to start the result set at. This can be used to skip the list or page the list of results.</p>                                                                                                                                                                                                                                                                                                                                          |
| email          | string | <p>(Optional)<br><br>If provided, filters results by the provided email value. Any email value that is provided <strong>must be URL encoded</strong>.<br><br><em>For data privacy and security purposes,  invite (<code>INVITE\_SENT</code>) referral results cannot be filtered by email addresses.</em></p>                                                                                                                                                                  |
| firstName      | string | <p>(Optional)<br><br>If provided, filters results by the given first name value</p>                                                                                                                                                                                                                                                                                                                                                                                            |
| lastName       | string | <p>(Optional)<br><br>If provided, filters results by the given last name value</p>                                                                                                                                                                                                                                                                                                                                                                                             |
| referralStatus | string | <p>(Optional)<br><br>If provided, filters results by the given referral status. Valid values for this filter are <code>CREDIT\_PENDING</code>, <code>CREDIT\_AWARDED</code>, <code>CREDIT\_EXPIRED</code>, <code>INVITE\_SENT</code>.<br><br>Any values other than the ones listed above will be ignored.</p>                                                                                                                                                                  |
| nextId         | string | <p>(Optional)<br><br>The ID of the result to start the next result set with. This can be used to skip through the list or to page the list results. Each response will provide a <code>nextId</code> value, based on the provided <code>sortBy</code> value, if there are more results otherwise the <code>nextId</code> value will be <code>null</code>.</p><p></p><p>A boolean field <code>more</code> will always be present for determining if there are more results.</p> |

#### Response

{% tabs %}
{% tab title="200" %}
This is an example response for this endpoint.

```json
{
    "referrals": [{
            "id": "f2bukr",
            "email": "gavin@hooli.com",
            "firstName": "Gavin",
            "lastName": "Belson",
            "referralStatus": "CREDIT_AWARDED",
            "referredBy": "2khaha",
            "createdAt": 1591546112223,
            "updatedAt": 1591546285013
        },
        {
            "id": "qbp153",
            "email": "richard@piedpiper.com",
            "firstName": "Richard",
            "lastName": "Hendricks",
            "referralStatus": "CREDIT_PENDING",
            "referredBy": "2khaha",
            "createdAt": 1591542657835,
            "updatedAt": 1591542658457
        },
        {
            "id": "ghw131",
            "email": "danish@piedpiper.com",
            "firstName": "Danish",
            "lastName": "Chugtai",
            "referralStatus": "CREDIT_EXPIRED",
            "referredBy": "2khaha",
            "createdAt": 1591548886835,
            "updatedAt": 1591542677457
        },
        {
            "id": "ugqeq9",
            "email": "***************",
            "firstName": null,
            "lastName": null,
            "referralStatus": "INVITE_SENT",
            "referredBy": "2khaha",
            "createdAt": 1591469527740,
            "updatedAt": 1591469527740
        }
    ],
    "limit": 4,
    "nextOffset": 4,
    "nextId": "gale@piedpiper.com",
    "more": true
}
```

{% endtab %}
{% endtabs %}

### Send Participant Invites by ID

<mark style="color:green;">`POST`</mark> `https://api.growsurf.com/v2/campaign/:id/participant/:participantId/invites`

Sends email invites on behalf of a participant to a list of email addresses.

**NOTE:** Your program must have a custom 'From' email address in order for email invites to be sent out. Learn more [here](https://support.growsurf.com/article/281-how-to-customize-the-from-email-address-in-growsurf-emails).

#### Path Parameters

| Name                                            | Type   | Description        |
| ----------------------------------------------- | ------ | ------------------ |
| id<mark style="color:red;">\*</mark>            | string | The program ID     |
| participantId<mark style="color:red;">\*</mark> | string | The participant ID |

#### Request Body

| Name                                             | Type   | Description                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| emailAddresses<mark style="color:red;">\*</mark> | array  | A list of email addresses to send invites to                                                                                                                                                                                                                                                                                                                                                                      |
| messageText<mark style="color:red;">\*</mark>    | string | <p>The email message body.</p><p></p><p>Make sure to include <code>{{referrerMessage}}</code> in the contents, which will be interpolated with the participant's personalized message.</p><p><br>You can also pass in the following values:</p><p></p><p><code>{{referrerFirstName}}</code><br><code>{{referrerLastName}}</code></p><p><code>{{referrerEmail}}</code></p><p><code>{{referrerShareUrl}}</code></p> |
| subjectText<mark style="color:red;">\*</mark>    | string | <p>The email subject line.</p><p></p><p>You can pass in the following values:<br><br><code>{{referrerFirstName}}</code><br><code>{{referrerLastName}}</code></p><p><code>{{referrerEmail}}</code></p><p><code>{{referrerMessage}}</code></p><p><code>{{referrerShareUrl}}</code></p>                                                                                                                              |

#### Response

{% tabs %}
{% tab title="200 " %}
This is an example response for this request.

```json
{
    "success": true,
    "messageType": "sent",
    "invitesSent": 1
}
```

{% endtab %}
{% endtabs %}

### Send Participant Invites by Email

<mark style="color:green;">`POST`</mark> `https://api.growsurf.com/v2/campaign/:id/participant/:participantEmail/invites`

Sends email invites on behalf of a participant to a list of email addresses.

{% hint style="warning" %}
**Important Note:** Your program must have a custom 'From' email address in order for email invites to be sent out. Learn more [here](https://support.growsurf.com/article/281-how-to-customize-the-from-email-address-in-growsurf-emails).
{% endhint %}

#### Path Parameters

| Name                                               | Type   | Description                     |
| -------------------------------------------------- | ------ | ------------------------------- |
| id<mark style="color:red;">\*</mark>               | string | The program ID                  |
| participantEmail<mark style="color:red;">\*</mark> | string | The participant's email address |

#### Request Body

| Name                                             | Type   | Description                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| emailAddresses<mark style="color:red;">\*</mark> | array  | A list of email addresses to send invites to                                                                                                                                                                                                                                                                                                                                                                      |
| messageText<mark style="color:red;">\*</mark>    | string | <p>The email message body.</p><p></p><p>Make sure to include <code>{{referrerMessage}}</code> in the contents, which will be interpolated with the participant's personalized message.</p><p><br>You can also pass in the following values:</p><p></p><p><code>{{referrerFirstName}}</code><br><code>{{referrerLastName}}</code></p><p><code>{{referrerEmail}}</code></p><p><code>{{referrerShareUrl}}</code></p> |
| subjectText<mark style="color:red;">\*</mark>    | string | <p>The email subject line.<br><br>You can pass in the following values:<br><br><code>{{referrerFirstName}}</code><br><code>{{referrerLastName}}</code></p><p><code>{{referrerEmail}}</code></p><p><code>{{referrerMessage}}</code></p><p><code>{{referrerShareUrl}}</code></p>                                                                                                                                    |

#### Response

{% tabs %}
{% tab title="200" %}
This is an example response for this request.

```json
{
    "success": true,
    "messageType": "sent",
    "invitesSent": 1
}
```

{% endtab %}
{% endtabs %}

***

## ANALYTICS ↓

### Get Campaign Analytics

<mark style="color:blue;">`GET`</mark> `https://api.growsurf.com/v2/campaign/:id/analytics`

Retrieves the analytics for a program.

#### Path Parameters

| Name                                 | Type    | Description                                                                                                                                                                                     |
| ------------------------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id<mark style="color:red;">\*</mark> | string  | The ID of the program to retrieve analytics for.                                                                                                                                                |
| days                                 | integer | <p>(Optional) <br><br>The last number of days to retrieve analytics for. Defaults to <code>365</code> if no value is provided.  Maximum limit is <code>1825</code>.</p>                         |
| startDate                            | integer | <p>(Optional but required if <code>days</code> is not set)<br><br>The start date of the analytics timeframe as a Unix timestamp in milliseconds. Example value: <code>1592359793538</code>.</p> |
| endDate                              | integer | <p>(Optional but required if <code>days</code> is not set)<br><br>The end date of the analytics timeframe as a Unix timestamp in milliseconds. Example value: <code>1747879793538</code>.</p>   |

#### Response

{% tabs %}
{% tab title="200" %}
Returns an `analytics` object for the program.

```json
{
  "analytics": {
    "invites": 13,
    "impressions": 213,
    "uniqueImpressions": 34,
    "participants": 400,
    "referrals": 113,
    "referralCreditPendings": 298,
    "referralCreditExpireds": 15,
    "emailShares": 1,
    "facebookShares": 8,
    "twitterShares": 53,
    "threadsShares": 7,
    "blueskyShares": 10,
    "pinterestShares": 9,
    "linkedInShares": 0,
    "smsShares": 4,
    "messengerShares": 5,
    "whatsAppShares": 1,
    "wechatShares": 4,
    "telegramShares": 5,
    "qrcodeShares": 49,
    "redditShares": 4,
    "tumblrShares": 0,
    
    // Only available only to affiliate programs:
    "totalRevenue": 982151, // Revenue in smallest currency unit (e.g., cents) of the program currency
    "totalCommissions": 314231, // Commissions in smallest currency unit of the program currency
    "totalCommissionCount": 49 // Number of commission records
  },
  "startDate": 1592359793538,
  "endDate": 1747879793538
}
```

{% endtab %}
{% endtabs %}

***

## AFFILIATE PROGRAMS ↓

### Add Transaction by Participant Email

<mark style="color:green;">`POST`</mark> `https://api.growsurf.com/v2/campaign/:id/participant/:participantEmail/transaction`&#x20;

\[Only applies to affiliate programs] Records a sale made by a referred customer (identified by their GrowSurf participant email) and generates affiliate commissions for their referrer when applicable.

{% hint style="info" %}
Use this endpoint if your payment processor isn’t directly supported by GrowSurf for automatic sale tracking. If you’re using a supported processor like Stripe, we recommend enabling our [Stripe integration](https://docs.growsurf.com/integrations/stripe#for-affiliate-programs) to automatically track sales and calculate commissions.
{% endhint %}

#### Path Parameters

| Name                                               | Type   | Description                                                                                   |
| -------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| id<mark style="color:red;">\*</mark>               | string | The ID of the program                                                                         |
| participantEmail<mark style="color:red;">\*</mark> | string | The email address of the GrowSurf participant. This is your customer that sent you a payment. |

#### Request Body

| Name                                                                                                                     | Type    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| currency<mark style="color:red;">\*</mark>                                                                               | string  | [ISO-4217](https://www.iso.org/iso-4217-currency-codes.html) currency code; must match program currency.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| grossAmount<mark style="color:red;">\*</mark>                                                                            | integer | <p>Total sale amount in the smallest currency unit (e.g., 100 cents to charge $1.00 or 100 to charge ¥100, a zero-decimal currency). Must be a positive integer and is the baseline amount recorded for the sale.</p><p><br>Example values:</p><p><br>$5.00 is <code>500</code><br>$899.00 is <code>89900</code> </p><p>$25,581.99 is <code>2558199</code><br>¥500 is <code>500</code><br>¥89,900 is <code>89900</code> </p><p>¥2,558,199 is <code>2558199</code></p>                                                                                                                                                                                |
| <p>invoiceId,</p><p>chargeId,<br>paymentIntentId,</p><p>transactionId,<br>externalId,</p><p>orderId,</p><p>paymentId</p> | string  | <p>(Optional)<br><br>Providing at least one of these fields ensures idempotency for each payment. This ensures the same sale isn’t recorded twice (thus avoiding a duplicate commission being generated). <br><br>We recommend using <code>invoiceId</code>, <code>chargeId</code>, <code>paymentId</code>, or <code>paymentIntentId</code> as these will check against duplicate sales from other providers (e.g, Stripe). Otherwise, idempotency checks will only check for duplicates from sales that were recording using the API \[and not a provider integration like <a href="https://docs.growsurf.com/integrations/stripe">Stripe</a>].</p> |
| netAmount                                                                                                                | integer | <p>(Optional)</p><p><br>Net-of-tax amount in minor units. If supplied, it becomes the preferred base for commission calculations without further derivation.</p>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| taxAmount                                                                                                                | integer | <p>(Optional)<br><br>Total tax collected in minor units. Used when <code>netAmount</code> is absent so we can back into a net figure (<code>grossAmount</code> - <code>taxAmount</code>).</p>                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| amountCashNet                                                                                                            | integer | <p>(Optional)<br><br>Explicit post-tax cash amount in minor units. Overrides any derived net amount; send this if you already know the exact commissionable base.</p>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| amountPaid                                                                                                               | integer | <p>(Optional)<br><br>Amount the payment processor confirms was actually paid (minor units). Optional pass-through for reconciliation.</p>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| paidAt<mark style="color:$info;">†</mark>                                                                                | integer | <p>(Optional)<br><br>Unix timestamp in milliseconds when the payment actually occurred. GrowSurf uses this value to evaluate commission duration and intro windows; if you omit it, we fall back to the time the API call is received.</p>                                                                                                                                                                                                                                                                                                                                                                                                           |
| description                                                                                                              | string  | <p>(Optional)<br><br>Free-form description (max 500 chars). Useful for internal notes.</p>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

{% hint style="info" %}
† GrowSurf automatically enforces any commission structure duration (e.g, 12 months). This means you can keep sending sales for the same subscription because once the configured window is exceeded, no additional commissions are generated. For example, if the duration for an affiliate's commission structure is 12 months, you can call this API endpoint past 12 months and GrowSurf will not generate more than 12 commissions.
{% endhint %}

#### Request Examples

{% tabs %}
{% tab title="cURL" %}
Here is an example `cURL` command that calls this API endpoint. Remember to replace `YOUR_PROGRAM_ID` with your program ID, `referredperson@email.com` with the email address of your referred customer who made a payment, and `YOUR_API_KEY` with your API key.

{% code overflow="wrap" %}

```bash
curl -X POST "https://api.growsurf.com/v2/campaign/YOUR_PROGRAM_ID/participant/referredperson@email.com/sales" \
-H "Authorization: Bearer YOUR_API_KEY" \
-H "Content-Type: application/json" \
-d '{
   "currency": "USD",
   "grossAmount": 9900,
   "amountCashNet": 7900,
   "invoiceId": "invoice_54",
   "paidAt": 1733702400000,
   "description": "Renewal for Pro subscription"
}'
```

{% endcode %}
{% endtab %}
{% endtabs %}

#### Response

{% tabs %}
{% tab title="200" %}
If the sale is successfully recorded, the response will contain `sucess` as `true`.

* If it is the first-time that an affiliate will have a commission generated from their referral making a payment, `firstSale` will be `true`.
* Note that affiliate commission(s) are generated asynchronously and won’t be included in the response. If you need to receive commission details, we recommend using [Webhooks](https://docs.growsurf.com/developer-tools/webhooks).

```json
{
    "success": true,
    "firstSale": false,
    "duplicate": false,
    "message": "Sale was successfully recorded. Commission(s) for the referrer will be generated, if applicable."
}
```

If the sale is detected as a duplicate transaction, `success` will be `false`.

* If this sale was detected as a duplicate, `duplicate` will be `true`  and `commissionsCreated` will be `0`, and `message` will also indicate why the sale is a duplicate.
* Use `duplicateFields`  to see which identifiers were duplicate(s).
* Use `matchingCommissionIds` to see which commission(s) have matching payments that were identified as duplicate(s).

```json
{
    "success": false,
    "duplicate": true,
    "commissionsCreated": 0,
    "duplicateFields": [
        "invoiceId"
    ],
    "matchingCommissionIds": [
        "comm_jy6kl1"
    ],
    "message": "Sale already recorded for identifiers: invoiceId. Matching commission IDs: jy6kl1"
}
```

{% endtab %}

{% tab title="400" %}
Error response if the provided sale `currency` does not match the campaign currency.

```json
{
    "name": "BadRequestError",
    "code": "BAD_REQUEST_ERROR",
    "message": "Sale currency must match campaign currency (USD).",
    "status": 400,
    "supportUrl": "https://app.growsurf.com/settings#contact_support",
    "level": "error",
    "timestamp": "2019-12-31T22:07:49.957Z"
}
```

Error response if the provided participant \[who made the payment] does not have a referrer.

```json
{
    "name": "BadRequestError",
    "code": "BAD_REQUEST_ERROR",
    "message": "Participant does not have a referrer assigned.",
    "status": 400,
    "supportUrl": "https://app.growsurf.com/settings#contact_support",
    "level": "error",
    "timestamp": "2019-12-31T22:07:49.957Z"
}
```

{% endtab %}
{% endtabs %}

### Add Transaction by Participant ID

<mark style="color:green;">`POST`</mark> `https://api.growsurf.com/v2/campaign/:id/participant/:participantId/transaction`&#x20;

\[Only applies to affiliate programs] Records a sale made by a referred customer (identified by their GrowSurf participant ID) and generates affiliate commissions for their referrer when applicable.

{% hint style="info" %}
Use this endpoint if your payment processor isn’t directly supported by GrowSurf for automatic sale tracking. If you’re using a supported processor like Stripe, we recommend enabling our [Stripe integration](https://docs.growsurf.com/integrations/stripe#for-affiliate-programs) to automatically track sales and calculate commissions.
{% endhint %}

#### Path Parameters

| Name                                            | Type   | Description                                                                 |
| ----------------------------------------------- | ------ | --------------------------------------------------------------------------- |
| id<mark style="color:red;">\*</mark>            | string | The ID of the program                                                       |
| participantId<mark style="color:red;">\*</mark> | string | The GrowSurf participant ID. This is your customer that sent you a payment. |

#### Request Body

| Name                                                                                                                     | Type    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| currency<mark style="color:red;">\*</mark>                                                                               | string  | [ISO-4217](https://www.iso.org/iso-4217-currency-codes.html) currency code (e.g, `USD`, `CAD`, `JPY`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| grossAmount<mark style="color:red;">\*</mark>                                                                            | integer | <p>Total sale amount in the smallest currency unit (e.g., 100 cents to charge $1.00 or 100 to charge ¥100, a zero-decimal currency). Must be a positive integer and is the baseline amount recorded for the sale.</p><p><br>Example values:</p><p><br>$5.00 is <code>500</code><br>$899.00 is <code>89900</code> </p><p>$25,581.99 is <code>2558199</code><br>¥500 is <code>500</code><br>¥89,900 is <code>89900</code> </p><p>¥2,558,199 is <code>2558199</code></p>                                                                                                                                                                                |
| <p>invoiceId,</p><p>chargeId,<br>paymentIntentId,</p><p>transactionId,<br>externalId,</p><p>orderId,</p><p>paymentId</p> | string  | <p>(Optional)<br><br>Providing at least one of these fields ensures idempotency for each payment. This ensures the same sale isn’t recorded twice (thus avoiding a duplicate commission being generated). <br><br>We recommend using <code>invoiceId</code>, <code>chargeId</code>, <code>paymentId</code>, or <code>paymentIntentId</code> as these will check against duplicate sales from other providers (e.g, Stripe). Otherwise, idempotency checks will only check for duplicates from sales that were recording using the API \[and not a provider integration like <a href="https://docs.growsurf.com/integrations/stripe">Stripe</a>].</p> |
| netAmount                                                                                                                | integer | <p>(Optional)</p><p><br>Net-of-tax amount in minor units. If supplied, it becomes the preferred base for commission calculations without further derivation.</p>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| taxAmount                                                                                                                | integer | <p>(Optional)<br><br>Total tax collected in minor units. Used when <code>netAmount</code> is absent so we can back into a net figure (<code>grossAmount</code> - <code>taxAmount</code>).</p>                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| amountCashNet                                                                                                            | integer | <p>(Optional)<br><br>Explicit post-tax cash amount in minor units. Overrides any derived net amount; send this if you already know the exact commissionable base.</p>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| amountPaid                                                                                                               | integer | <p>(Optional)<br><br>Amount the payment processor confirms was actually paid (minor units). Optional pass-through for reconciliation.</p>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| paidAt<mark style="color:$info;">†</mark>                                                                                | integer | <p>(Optional)<br><br>Unix timestamp in milliseconds when the payment actually occurred. GrowSurf uses this value to evaluate commission duration and intro windows; if you omit it, we fall back to the time the API call is received.</p>                                                                                                                                                                                                                                                                                                                                                                                                           |
| description                                                                                                              | string  | <p>(Optional)<br><br>Free-form description (max 500 chars). Useful for internal notes.</p>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

{% hint style="info" %}
† GrowSurf automatically enforces any commission structure duration (e.g, 12 months). This means you can keep sending sales for the same subscription because once the configured window is exceeded, no additional commissions are generated. For example, if the duration for an affiliate's commission structure is 12 months, you can call this API endpoint past 12 months and GrowSurf will not generate more than 12 commissions.
{% endhint %}

#### Request Examples

{% tabs %}
{% tab title="cURL" %}
Here is an example `cURL` command that calls this API endpoint. Remember to replace `YOUR_PROGRAM_ID` with your program ID, `xyz789` with the GrowSurf participant ID of your referred customer who made a payment, and `YOUR_API_KEY` with your API key.

{% code overflow="wrap" %}

```bash
curl -X POST "https://api.growsurf.com/v2/campaign/YOUR_PROGRAM_ID/participant/xyz789/sales" \
-H "Authorization: Bearer YOUR_API_KEY" \
-H "Content-Type: application/json" \
-d '{
   "currency": "USD",
   "grossAmount": 9900,
   "amountCashNet": 7900,
   "invoiceId": "invoice_54",
   "paidAt": 1733702400000,
   "description": "Renewal for Pro subscription"
}'
```

{% endcode %}
{% endtab %}
{% endtabs %}

#### Response

{% tabs %}
{% tab title="200" %}
If the sale is successfully recorded, the response will contain `sucess` as `true`.

* If it is the first-time that an affiliate will have a commission generated from their referral making a payment, `firstSale` will be `true`.
* Note that affiliate commission(s) are generated asynchronously and won’t be included in the response. If you need to receive commission details, we recommend using [Webhooks](https://docs.growsurf.com/developer-tools/webhooks).

```json
{
    "success": true,
    "firstSale": false,
    "duplicate": false,
    "message": "Sale was successfully recorded. Commission(s) for the referrer will be generated, if applicable."
}
```

If the sale is detected as a duplicate transaction, `success` will be `false`.

* If this sale was detected as a duplicate, `duplicate` will be `true`  and `commissionsCreated` will be `0`, and `message` will also indicate why the sale is a duplicate.
* Use `duplicateFields`  to see which identifiers were duplicate(s).
* Use `matchingCommissionIds` to see which commission(s) have matching payments that were identified as duplicate(s).

```json
{
    "success": false,
    "duplicate": true,
    "commissionsCreated": 0,
    "duplicateFields": [
        "invoiceId"
    ],
    "matchingCommissionIds": [
        "comm_jy6kl1"
    ],
    "message": "Sale already recorded for identifiers: invoiceId. Matching commission IDs: jy6kl1"
}
```

{% endtab %}

{% tab title="400" %}
Error response if the provided sale `currency` does not match the campaign currency.

```json
{
    "name": "BadRequestError",
    "code": "BAD_REQUEST_ERROR",
    "message": "Sale currency must match campaign currency (USD).",
    "status": 400,
    "supportUrl": "https://app.growsurf.com/settings#contact_support",
    "level": "error",
    "timestamp": "2019-12-31T22:07:49.957Z"
}
```

Error response if the provided participant \[who made the payment] does not have a referrer.

```json
{
    "name": "BadRequestError",
    "code": "BAD_REQUEST_ERROR",
    "message": "Participant does not have a referrer assigned.",
    "status": 400,
    "supportUrl": "https://app.growsurf.com/settings#contact_support",
    "level": "error",
    "timestamp": "2019-12-31T22:07:49.957Z"
}
```

{% endtab %}
{% endtabs %}

### Get Participant Commissions

<mark style="color:blue;">`GET`</mark> `https://api.growsurf.com/v2/campaign/:id/commissions`

Retrieves a list of all participant commissions in the program.

| Name                                 | Type   | Description                                                    |
| ------------------------------------ | ------ | -------------------------------------------------------------- |
| id<mark style="color:red;">\*</mark> | string | The ID of the program to retrieve participant commissions from |

#### Query Parameters

| Name   | Type   | Description                                                                                                                                                                                                                                                                                                                  |
| ------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| nextId | string | <p>(Optional)<br><br>The ID of the participant commission to start the next result set with. This can be used to skip through the list or to page the list of results. Each response will provide a <code>nextId</code> value if there are more commissions otherwise the <code>nextId</code> will be <code>null</code>.</p> |
| limit  | string | <p>(Optional)<br><br>The number of commissions to return. Must be a value less than or equal to 100, which is currently the maximum allowed per request.</p>                                                                                                                                                                 |
| status | string | <p>(Optional)<br><br>Filter by commission status. Options: <code>PENDING</code>, <code>APPROVED</code>, <code>PAID</code>, <code>REVERSED</code>.</p>                                                                                                                                                                        |

#### Response

{% tabs %}
{% tab title="200" %}
In this example we are showing two commissions earned by participants in `USD` (from `currencyISO`). They earned $1,000 USD each (from `amount`) from their referrals' payment of $10,000 (from `saleAmount`). These commissions are still pending (from `status`), and will automatically become approved and eligible to be paid out once the hold duration period (`holdDuration`) period has ended.

{% hint style="info" %}
GrowSurf has multi-currency support. This means that if your program currency (`campaignCurrencyISO`) was different from the commission currency of `USD`, you could use `amountInCampaignCurrency` and `saleAmountAmountInCampaignCurrency` to get normalized values.
{% endhint %}

To see more details about each field, view [`ParticipantCommission`](https://docs.growsurf.com/developer-tools/rest-api/api-objects#participantcommission).

```json
{
    "commissions": [
        {
            "id": "comm_abc123",
            "referrerId": "f8g9nl",
            "referredId": "h8kp6l",
            "amount": 1000,
            "saleAmount": 10000,
            "currencyISO": "USD",
            "status": "PENDING",
            "approvedAt": null,
            "paidAt": null,
            "reversedAt": null,
            "holdDuration": 30,
            "payoutQueuedAt": null,
            "provider": "stripe",
            "createdAt": 1591546112223,
            "amountInCampaignCurrency": 1000,
            "saleAmountAmountInCampaignCurrency": 10000,
            "exchangeRate": null,
            "campaignCurrencyISO": "USD",
            "exchangeRateAt": null,
            "fxError": null
        },
        {
            "id": "comm_bhg675",
            "referrerId": "d9iu21",
            "referredId": "a26lkp",
            "amount": 1000,
            "saleAmount": 10000,
            "currencyISO": "USD",
            "status": "PENDING",
            "approvedAt": null,
            "paidAt": null,
            "reversedAt": null,
            "holdDuration": 30,
            "payoutQueuedAt": null,
            "provider": "stripe",
            "createdAt": 1591546112223,
            "amountInCampaignCurrency": 1000,
            "saleAmountAmountInCampaignCurrency": 10000,
            "exchangeRate": null,
            "campaignCurrencyISO": "USD",
            "exchangeRateAt": null,
            "fxError": null
        }        
    ],
    "limit": 10,
    "nextId": null
}
```

{% endtab %}
{% endtabs %}

### Get Participant Commissions by ID

<mark style="color:blue;">`GET`</mark> `https://api.growsurf.com/v2/campaign/:id/participant/:participantId/commissions`

Retrieves a list of commissions earned by a participant using the given participant ID.

| Name                                            | Type   | Description                                                    |
| ----------------------------------------------- | ------ | -------------------------------------------------------------- |
| id<mark style="color:red;">\*</mark>            | string | The ID of the program to retrieve participant commissions from |
| participantId<mark style="color:red;">\*</mark> | string | The ID of the participant to retrieve commissions for          |

#### Query Parameters

| Name   | Type   | Description                                                                                                                                                                                                                                                                                                                  |
| ------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| nextId | string | <p>(Optional)<br><br>The ID of the participant commission to start the next result set with. This can be used to skip through the list or to page the list of results. Each response will provide a <code>nextId</code> value if there are more commissions otherwise the <code>nextId</code> will be <code>null</code>.</p> |
| limit  | string | <p>(Optional)<br><br>The number of commissions to return. Must be a value less than or equal to 100, which is currently the maximum allowed per request.</p>                                                                                                                                                                 |
| status | string | <p>(Optional)<br><br>Filter by commission status. Options: <code>PENDING</code>, <code>APPROVED</code>, <code>PAID</code>, <code>REVERSED</code>.</p>                                                                                                                                                                        |

#### Response

{% tabs %}
{% tab title="200" %}
In this example we are showing one commission earned by the participant in `USD` (from `currencyISO`). They earned $1,000 USD (from `amount`) from their referral's payment of $10,000 (from `saleAmount`). This commission is still pending (from `status`), and will automatically become approved and eligible to be paid out once the hold duration period (`holdDuration`) period has ended.

{% hint style="info" %}
GrowSurf has multi-currency support. This means that if your program currency (`campaignCurrencyISO`) was different from the commission currency of `USD`, you could use `amountInCampaignCurrency` and `saleAmountAmountInCampaignCurrency` to get normalized values.
{% endhint %}

To see more details about each field, view [`ParticipantCommission`](https://docs.growsurf.com/developer-tools/rest-api/api-objects#participantcommission).

```json
{
    "commissions": [
        {
            "id": "comm_abc123",
            "referrerId": "f8g9nl",
            "referredId": "h8kp6l",
            "amount": 1000,
            "saleAmount": 10000,
            "currencyISO": "USD",
            "status": "PENDING",
            "approvedAt": null,
            "paidAt": null,
            "reversedAt": null,
            "holdDuration": 30,
            "payoutQueuedAt": null,
            "provider": "stripe",
            "createdAt": 1591546112223,
            "amountInCampaignCurrency": 1000,
            "saleAmountAmountInCampaignCurrency": 10000,
            "exchangeRate": null,
            "campaignCurrencyISO": "USD",
            "exchangeRateAt": null,
            "fxError": null
        }
    ],
    "limit": 10,
    "nextId": null
}
```

{% endtab %}

{% tab title="400" %}
Error response returned if the `limit` query parameter that is provided exceeds the maximum allowed amount.

```json
{
    "name": "BadRequestError",
    "code": "BAD_REQUEST_ERROR",
    "message": "Invalid request. Request params are missing or are invalid",
    "status": 400,
    "supportUrl": "https://app.growsurf.com/settings#contact_support",
    "errors": [
        {
            "location": "query",
            "param": "limit",
            "value": "200",
            "msg": "Limit cannot be more than 101."
        }
    ],
    "level": "error",
    "timestamp": "2019-12-31T22:07:49.957Z"
}
```

{% endtab %}
{% endtabs %}

### Get Participant Commissions by Email

<mark style="color:blue;">`GET`</mark> `https://api.growsurf.com/v2/campaign/:id/participant/:participantEmail/commissions`

Retrieves a list of commissions earned by a participant using the given participant email address.

#### Path Parameters

| Name                                               | Type   | Description                                                      |
| -------------------------------------------------- | ------ | ---------------------------------------------------------------- |
| id<mark style="color:red;">\*</mark>               | string | The ID of the program to retrieve participant commissions from   |
| participantEmail<mark style="color:red;">\*</mark> | string | The email address of the participant to retrieve commissions for |

#### Query Parameters

| Name   | Type   | Description                                                                                                                                                                                                                                                                                                                  |
| ------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| nextId | string | <p>(Optional)<br><br>The ID of the participant commission to start the next result set with. This can be used to skip through the list or to page the list of results. Each response will provide a <code>nextId</code> value if there are more commissions otherwise the <code>nextId</code> will be <code>null</code>.</p> |
| limit  | string | <p>(Optional)<br><br>The number of commissions to return. Must be a value less than or equal to 100, which is currently the maximum allowed per request.</p>                                                                                                                                                                 |
| status | string | <p>(Optional)<br><br>Filter by commission status. Options: <code>PENDING</code>, <code>APPROVED</code>, <code>PAID</code>, <code>REVERSED</code>.</p>                                                                                                                                                                        |

#### Response

{% tabs %}
{% tab title="200" %}
In this example we are showing one commission earned by the participant in `USD` (from `currencyISO`). They earned $1,000 USD (from `amount`) from their referral's payment of $10,000 (from `saleAmount`). This commission is still pending (from `status`), and will automatically become approved and eligible to be paid out once the hold duration period (`holdDuration`) period has ended.

{% hint style="info" %}
GrowSurf has multi-currency support. This means that if your program currency (`campaignCurrencyISO`) was different from the commission currency of `USD`, you could use `amountInCampaignCurrency` and `saleAmountAmountInCampaignCurrency` to get normalized values.
{% endhint %}

To see more details about each field, view [`ParticipantCommission`](https://docs.growsurf.com/developer-tools/rest-api/api-objects#participantcommission).

```json
{
    "commissions": [
        {
            "id": "comm_abc123",
            "referrerId": "f8g9nl",
            "referredId": "h8kp6l",
            "amount": 1000,
            "saleAmount": 10000,
            "currencyISO": "USD",
            "status": "PENDING",
            "approvedAt": null,
            "paidAt": null,
            "reversedAt": null,
            "holdDuration": 30,
            "payoutQueuedAt": null,
            "provider": "stripe",
            "createdAt": 1591546112223,
            "amountInCampaignCurrency": 1000,
            "saleAmountAmountInCampaignCurrency": 10000,
            "exchangeRate": null,
            "campaignCurrencyISO": "USD",
            "exchangeRateAt": null,
            "fxError": null
        }
    ],
    "limit": 10,
    "nextId": null
}
```

{% endtab %}

{% tab title="400" %}
Error response returned if the `limit` query parameter that is provided exceeds the maximum allowed amount.

```json
{
    "name": "BadRequestError",
    "code": "BAD_REQUEST_ERROR",
    "message": "Invalid request. Request params are missing or are invalid",
    "status": 400,
    "supportUrl": "https://app.growsurf.com/settings#contact_support",
    "errors": [
        {
            "location": "query",
            "param": "limit",
            "value": "200",
            "msg": "Limit cannot be more than 101."
        }
    ],
    "level": "error",
    "timestamp": "2019-12-31T22:07:49.957Z"
}
```

{% endtab %}
{% endtabs %}

### Approve Participant Commission

<mark style="color:green;">`POST`</mark> `https://api.growsurf.com/v2/campaign/:id/commission/:commissionId/approve`

Approves a participant's commission so it can be eligible to be paid out.

This only applies for pending participant commissions.

#### Path Parameters

| Name                                           | Type   | Description                                                                                                                               |
| ---------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| id<mark style="color:red;">\*</mark>           | string | The ID of the program.                                                                                                                    |
| commissionId<mark style="color:red;">\*</mark> | string | The ID of the [`ParticipantCommission`](https://docs.growsurf.com/developer-tools/rest-api/api-objects#participantcommission) to approve. |

#### Response

{% tabs %}
{% tab title="200" %}
Returns a success response.

```json
{
    "success": true
}
```

{% endtab %}

{% tab title="406" %}
Error response returned if a commission has already been paid and thus cannot be approved.

```json
{
    "name": "InvalidCommissionState",
    "code": "INVALID_COMMISSION_STATE",
    "message": "Invalid commission state. Commission has already been paid.",
    "status": 406,
    "supportUrl": "https://growsurf.com/settings#contact_support",
    "level": "error",
    "timestamp": "2019-10-13T16:43:05.902Z"
}
```

You'll also get an error if the commission was already reversed or deleted.
{% endtab %}
{% endtabs %}

### Remove Participant Commission

<mark style="color:red;">`DELETE`</mark> `https://api.growsurf.com/v2/campaign/:id/commission/:commissionId`&#x20;

Remove a commission that was earned by a participant.\
\
This only applies for pending participant commissions.

#### Path Parameters

| Name                                           | Type   | Description                                                                                                                              |
| ---------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| id<mark style="color:red;">\*</mark>           | string | The program ID                                                                                                                           |
| commissionId<mark style="color:red;">\*</mark> | string | The ID of the [`ParticipantCommission`](https://docs.growsurf.com/developer-tools/rest-api/api-objects#participantcommission) to delete. |

#### Response

{% tabs %}
{% tab title="200" %}
Returns a success response.

```json
{
    "success": true
}
```

{% endtab %}

{% tab title="406" %}
Error response returned if a commission has already been approved and thus cannot be deleted.&#x20;

```json
{
    "name": "InvalidCommissionState",
    "code": "INVALID_COMMISSION_STATE",
    "message": "Invalid commission state. This commission has already been approved and cannot be removed.",
    "status": 406,
    "supportUrl": "https://growsurf.com/settings#contact_support",
    "level": "error",
    "timestamp": "2019-10-17T16:43:05.902Z"
}
```

You'll also get an error if the commission was already paid or reversed.
{% endtab %}
{% endtabs %}

### Get Participant Payouts

<mark style="color:blue;">`GET`</mark> `https://api.growsurf.com/v2/campaign/:id/payouts`

Retrieves a list of all participant payouts in the program.

| Name                                 | Type   | Description                                                |
| ------------------------------------ | ------ | ---------------------------------------------------------- |
| id<mark style="color:red;">\*</mark> | string | The ID of the program to retrieve participant payouts from |

#### Query Parameters

| Name   | Type   | Description                                                                                                                                                                                                                                                                                                          |
| ------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| nextId | string | <p>(Optional)<br><br>The ID of the participant payout to start the next result set with. This can be used to skip through the list or to page the list of results. Each response will provide a <code>nextId</code> value if there are more payouts otherwise the <code>nextId</code> will be <code>null</code>.</p> |
| limit  | string | <p>(Optional)<br><br>The number of payouts to return. Must be a value less than or equal to 100, which is currently the maximum allowed per request.</p>                                                                                                                                                             |
| status | string | <p>(Optional)<br><br>Filter by payout status. Options: <code>UPCOMING</code>, <code>QUEUED</code>, <code>ISSUED</code>, <code>FAILED</code>.</p>                                                                                                                                                                     |

#### Response

{% tabs %}
{% tab title="200" %}
In this example we are showing two payouts that were issued to participants in `USD` (from `currencyISO`). They were paid out $3,600 USD each (from `amount`) from their commissions (from `commissionIds`).

To see more details about each field, view [`ParticipantPayout`](https://docs.growsurf.com/developer-tools/rest-api/api-objects#participantpayout).

```json
{
    "payouts": [
        {
          "id": "po_k11ps9",
          "participantId": "f8g9nl",
          "commissionIds": [
            "comm_jp1ku7",
            "comm_a98s7z"
          ],
          "amount": 3600,
          "currencyISO": "USD",
          "status": "ISSUED",
          "createdAt": 1635638400000,  
          "issuedAt": 1635724800000,
          "failedAt": null,
          "provider": "paypal",
          "amountInCampaignCurrency": 3600,
          "campaignCurrencyISO": "USD",
          "exchangeRateAt": 1635638400000,
          "exchangeRate": 1.0,        
          "fxError": null
        },
        {
          "id": "po_b2cc1a",
          "participantId": "po188h",
          "commissionIds": [
            "comm_dua8a5",
            "comm_bb7a21"
          ],
          "amount": 3600,
          "currencyISO": "USD",
          "status": "ISSUED",
          "createdAt": 1635638400000,  
          "issuedAt": 1635724800000,
          "failedAt": null,
          "provider": "paypal",
          "amountInCampaignCurrency": 3600,
          "campaignCurrencyISO": "USD",
          "exchangeRateAt": 1635638400000,
          "exchangeRate": 1.0,        
          "fxError": null
        }        
    ],
    "limit": 10,
    "nextId": null
}
```

{% endtab %}
{% endtabs %}

### Get Participant Payouts by ID

<mark style="color:blue;">`GET`</mark> `https://api.growsurf.com/v2/campaign/:id/participant/:participantId/payouts`

Retrieves a list of payouts that belong to a participant using the given participant ID.

| Name                                            | Type   | Description                                                |
| ----------------------------------------------- | ------ | ---------------------------------------------------------- |
| id<mark style="color:red;">\*</mark>            | string | The ID of the program to retrieve participant payouts from |
| participantId<mark style="color:red;">\*</mark> | string | The ID of the participant to retrieve payouts for          |

#### Query Parameters

| Name   | Type   | Description                                                                                                                                                                                                                                                                                                          |
| ------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| nextId | string | <p>(Optional)<br><br>The ID of the participant payout to start the next result set with. This can be used to skip through the list or to page the list of results. Each response will provide a <code>nextId</code> value if there are more payouts otherwise the <code>nextId</code> will be <code>null</code>.</p> |
| limit  | string | <p>(Optional)<br><br>The number of payouts to return. Must be a value less than or equal to 100, which is currently the maximum allowed per request.</p>                                                                                                                                                             |
| status | string | <p>(Optional)<br><br>Filter by payout status. Options: <code>UPCOMING</code>, <code>QUEUED</code>, <code>ISSUED</code>, <code>FAILED</code>.</p>                                                                                                                                                                     |

#### Response

{% tabs %}
{% tab title="200" %}
In this example we are showing one payout that was issued to the participant in `USD` (from `currencyISO`). They were paid out $3,600 USD (from `amount`) from their commissions (from `commissionIds`).

To see more details about each field, view [`ParticipantPayout`](https://docs.growsurf.com/developer-tools/rest-api/api-objects#participantpayout).

```json
{
    "payouts": [
        {
          "id": "po_k11ps9",
          "participantId": "f8g9nl",
          "commissionIds": [
            "comm_jp1ku7",
            "comm_a98s7z"
          ],
          "amount": 3600,
          "currencyISO": "USD",
          "status": "ISSUED",
          "createdAt": 1635638400000,  
          "issuedAt": 1635724800000,
          "failedAt": null,
          "provider": "paypal",
          "amountInCampaignCurrency": 3600,
          "campaignCurrencyISO": "USD",
          "exchangeRateAt": 1635638400000,
          "exchangeRate": 1.0,        
          "fxError": null
        }
    ],
    "limit": 10,
    "nextId": null
}
```

{% endtab %}

{% tab title="400" %}
Error response returned if the `limit` query parameter that is provided exceeds the maximum allowed amount.

```json
{
    "name": "BadRequestError",
    "code": "BAD_REQUEST_ERROR",
    "message": "Invalid request. Request params are missing or are invalid",
    "status": 400,
    "supportUrl": "https://app.growsurf.com/settings#contact_support",
    "errors": [
        {
            "location": "query",
            "param": "limit",
            "value": "200",
            "msg": "Limit cannot be more than 101."
        }
    ],
    "level": "error",
    "timestamp": "2019-12-31T22:07:49.957Z"
}
```

{% endtab %}
{% endtabs %}

### Get Participant Payouts by Email

<mark style="color:blue;">`GET`</mark> `https://api.growsurf.com/v2/campaign/:id/participant/:participantEmail/payouts`

Retrieves a list of payouts that belong to a participant using the given participant email address.

#### Path Parameters

| Name                                               | Type   | Description                                                  |
| -------------------------------------------------- | ------ | ------------------------------------------------------------ |
| id<mark style="color:red;">\*</mark>               | string | The ID of the program to retrieve participant payouts from   |
| participantEmail<mark style="color:red;">\*</mark> | string | The email address of the participant to retrieve payouts for |

#### Query Parameters

| Name   | Type   | Description                                                                                                                                                                                                                                                                                                          |
| ------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| nextId | string | <p>(Optional)<br><br>The ID of the participant payout to start the next result set with. This can be used to skip through the list or to page the list of results. Each response will provide a <code>nextId</code> value if there are more payouts otherwise the <code>nextId</code> will be <code>null</code>.</p> |
| limit  | string | <p>(Optional)<br><br>The number of payouts to return. Must be a value less than or equal to 100, which is currently the maximum allowed per request.</p>                                                                                                                                                             |
| status | string | <p>(Optional)<br><br>Filter by payout status. Options: <code>UPCOMING</code>, <code>QUEUED</code>, <code>ISSUED</code>, <code>FAILED</code>.</p>                                                                                                                                                                     |

#### Response

{% tabs %}
{% tab title="200" %}
In this example we are showing one payout that was issued to the participant in `USD` (from `currencyISO`). They were paid out $3,600 USD (from `amount`) from their commissions (from `commissionIds`).

To see more details about each field, view [`ParticipantPayout`](https://docs.growsurf.com/developer-tools/rest-api/api-objects#participantpayout).

```json
{
    "payouts": [
        {
          "id": "po_k11ps9",
          "participantId": "f8g9nl",
          "commissionIds": [
            "comm_jp1ku7",
            "comm_a98s7z"
          ],
          "amount": 3600,
          "currencyISO": "USD",
          "status": "ISSUED",
          "createdAt": 1635638400000,  
          "issuedAt": 1635724800000,
          "failedAt": null,
          "provider": "paypal",
          "amountInCampaignCurrency": 3600,
          "campaignCurrencyISO": "USD",
          "exchangeRateAt": 1635638400000,
          "exchangeRate": 1.0,
          "fxError": null
        }
    ],
    "limit": 10,
    "nextId": null
}
```

{% endtab %}

{% tab title="400" %}
Error response returned if the `limit` query parameter that is provided exceeds the maximum allowed amount.

```json
{
    "name": "BadRequestError",
    "code": "BAD_REQUEST_ERROR",
    "message": "Invalid request. Request params are missing or are invalid",
    "status": 400,
    "supportUrl": "https://app.growsurf.com/settings#contact_support",
    "errors": [
        {
            "location": "query",
            "param": "limit",
            "value": "200",
            "msg": "Limit cannot be more than 101."
        }
    ],
    "level": "error",
    "timestamp": "2019-12-31T22:07:49.957Z"
}
```

{% endtab %}
{% endtabs %}
