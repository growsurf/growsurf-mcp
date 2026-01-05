# API Guidelines

Requests

* All requests should be made using HTTPS.
* JSON objects are recommended for POST requests, but standard parameters are accepted.
* All parameters are required unless otherwise specified.

## Responses

* Data is returned in JSON.
* Any non-`200` HTTP response code can be considered an error.

{% hint style="info" %}
**Tip:** Refer to [Response Codes](https://docs.growsurf.com/developer-tools/rest-api/api-response-codes) for help in troubleshooting any errors.
{% endhint %}

## Rate Limits

All API requests made to GrowSurf (including client and server calls) are appropriately rate-limited to prevent excessive requests. If you exceed those limits, you will start receiving 429 error responses for any API calls that you make. Those 429 responses will have the following format.

```javascript
{
    "name": "RateLimit",
    "code": "RATE_LIMIT",
    "message": "You have reached your minute limit.",
    "status": 429,
    "supportUrl": "https://growsurf.com/settings#contact_support",
    "policyName": "MINUTE",
    "level": "error",
    "timestamp": "2019-12-08T00:05:45.478Z"
}
```

The `message` and `policyName` will indicate which limit you hit (e.g. second, minute, or hour).

### Rate Headers

{% hint style="info" %}
&#x20;**NOTE:** These headers are only included for requests made using an API key.
{% endhint %}

| Header                                         | Description                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`GrowSurf-RateLimit-Second-Limit`**          | The number of API requests that are allowed per second.                                                                                                                                                                                                                                                             |
| **`GrowSurf-RateLimit-Second-Remaining`**      | The number of API requests remaining within the second policy.                                                                                                                                                                                                                                                      |
| **`GrowSurf-Retry-After-Second-Milliseconds`** | <p> The window of time that the  <code>GrowSurf-RateLimit-Second-Limit</code> and <code>Growsurf-RateLimit-Second-Remaining</code> headers apply to.<br><br>For example, a value of 1000 would be a window of 1 second.</p><p></p><p>This value is only provided if the second policy is hit or exceeded.</p>       |
| **`GrowSurf-RateLimit-Minute-Limit`**          | The number of API requests that are allowed per minute.                                                                                                                                                                                                                                                             |
| **`GrowSurf-RateLimit-Minute-Remaining`**      | The number of API requests remaining within the minute policy.                                                                                                                                                                                                                                                      |
| **`GrowSurf-Retry-After-Minute-Milliseconds`** | <p> The window of time that the  <code>GrowSurf-RateLimit-Minute-Limit</code> and <code>Growsurf-RateLimit-Minute-Remaining</code> headers apply to.<br></p><p>For example, a value of 10000 would be a window of 10 seconds.</p><p></p><p>This value is only provided if the minute policy is hit or exceeded.</p> |
| **`GrowSurf-RateLimit-Hour-Limit`**            | The number of API requests that are allowed per hour.                                                                                                                                                                                                                                                               |
| **`GrowSurf-RateLimit-Hour-Remaining`**        | The number of API requests remaining within the hour policy.                                                                                                                                                                                                                                                        |
| **`GrowSurf-Retry-After-Hour-Milliseconds`**   | <p>The window of time that the  <code>GrowSurf-RateLimit-Hour-Limit</code> and <code>Growsurf-RateLimit-Hour-Remaining</code> headers apply to.<br></p><p>For example, a value of 600000 would be a window of 10 minutes.</p><p></p><p>This value is only provided if the hour policy is hit or exceeded.</p>       |

### Policies

The following are the rate limits for all API requests made using an API key.

| Policy     | Limit                   |
| ---------- | ----------------------- |
| **Second** | 50 requests / 5 seconds |
| **Minute** | 400 requests / minute   |
| **Hour**   | 20,000 requests / hour  |

### Slowdown Rate

For operations which update a resource (`PUT`, `POST`, `DELETE`), if the cumulative rate of requests exceed 60 requests per minute, a slowdown delay will be added to each request thereafter. The delay is equal to the number of exceeded requests multiplied by 100 milliseconds (ms).

**For example:**

* 61st request: 100ms delay
* 63rd request: 300ms delay
* 70th request: 1000ms delay

### Max Connections

In addition to the rate limits and slowdown rate, the number of concurrent connections to the REST API allowed per IP address is limited to three (3).

Please note that if you hit a rate limit or max connection limit, you will see a [`429` error](https://docs.growsurf.com/api-response-codes#glossary).

### Suggestions

Here are some suggestions for using the GrowSurf API within policy limits.

#### 1. Cache data for repeat calls

If your site or app uses data from GrowSurf on each page load, that data should be cached and loaded from that cache instead of being requested from the GrowSurf APIs each time. If you're making repeated requests to get participant information or program data for a custom implementation, the information from those calls should also be cached when possible.

#### 2. Use Webhooks to get updated data from GrowSurf

Webhooks are an excellent way for your application to receive updated information from GrowSurf without needing to call GrowSurf APIs. More details about using Webhooks can be found [here](https://docs.growsurf.com/developer-tools/webhooks), with example data [here](https://docs.growsurf.com/developer-tools/webhooks/examples).

## Metadata

Certain GrowSurf objects, such as [`Participants`](https://docs.growsurf.com/developer-tools/api-objects#participant) and [`Rewards`](https://docs.growsurf.com/developer-tools/api-objects#reward)  can have a special `metadata`parameter, which is useful for storing any custom information.

Learn more here:

{% content-ref url="../metadata" %}
[metadata](https://docs.growsurf.com/developer-tools/metadata)
{% endcontent-ref %}
