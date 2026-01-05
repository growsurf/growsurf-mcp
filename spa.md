# Single Page Applications

{% hint style="info" %}
To test in a sandbox/development environment, we recommend creating two different programs for development and production environments. [Learn more here](https://support.growsurf.com/article/262-how-can-i-test-in-a-sandbox-or-development-environment).

Due to the asynchronous behavior of SPAs, if the GrowSurf Universal Code has already been added you may need to re-initialize GrowSurf at times. For example, if embeddable elements are not being displayed, call [growsurf.init()](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#initialize-reinitialize-growsurf).
{% endhint %}

## GitHub

[Check out the `growsurf-samples` GitHub repo for sample code](https://github.com/growsurf/growsurf-samples).

## React

Check out the GitHub sample code for React [here](https://github.com/growsurf/growsurf-samples/tree/master/samples/growsurf-react-example) and our [GrowSurf React project](https://github.com/growsurf/growsurf-react-firebase).

### React Component

To initialize GrowSurf asynchronously within your SPA, simply include the following code within your [React components `componentDidMount()` ](https://reactjs.org/docs/react-component.html#componentdidmount)lifecycle event.&#x20;

{% hint style="info" %}
IMPORTANT: `componentDidMount()`is a lifecycle method for class components and cannot be used in functional components. If you want to initialize GrowSurf using a functional component you will need to use the [Effect Hook](https://reactjs.org/docs/hooks-effect.html).
{% endhint %}

### Example using Classes

This snippet of code will only add the GrowSurf Universal Code when a visitor is brought to a page within your site that includes the component with this code. Once the script has been added successfully and [initialized](https://docs.growsurf.com/developer-tools/javascript-sdk/..#grsfready-event-listener), you will then have the ability to add any [GrowSurf embeddable element](https://docs.growsurf.com/developer-tools/embeddable-elements)(s) you would like within your components JSX.

{% code title="App.js" %}

```jsx
 class App extends React.Component {
   componentDidMount() {
    const script = document.createElement('script');
    script.src = 'https://app.growsurf.com/growsurf.js?v=2.0.0';
    script.setAttribute('grsf-campaign', 'jaoh4t');
    script.async = true;
    document.head.appendChild(script);
  }
  
  render() {
  return (
    <div>
      <div className='App'>REACT + GROWSURF</div>
      <div data-grsf-block-form></div>
    </div>
    ) 
  }
  }
```

{% endcode %}

### Example using Effect Hook

{% code title="App.js" %}

```jsx
  import {useEffect} from 'react'
  
  function App() {
    // GrowSurf Universal Code
    const addGrsfScript = () => {
      const script = document.createElement('script');
      script.src = 'https://app.growsurf.com/growsurf.js?v=2.0.0';
      script.setAttribute('grsf-campaign', 'jaoh4t');
      script.async = true;
      document.head.appendChild(script);
  };
    
    useEffect(() => {
    addGrsfScript();
    }, [])
  }
```

{% endcode %}

{% hint style="info" %}
In React, third-party JavaScript SDKs like GrowSurf's are not automatically accessible within the Virtual DOM. To interact with them, you must reference them via the `window` object.\
\
**Example**

```javascript
window.growsurf.getParticipantId();
```

{% endhint %}

## Vue

[Check out the GitHub sample code for Vue here](https://github.com/growsurf/growsurf-samples/tree/master/samples/growsurf-vue-example).

## Troubleshooting

If you experience issues with embeddable elements rendering on the page (depending on how URL routes are handled in your SPA, this behavior will typically be seen when you refresh the webpage with the absolute route) you will need to call [`growsurf.init()` ](https://docs.growsurf.com/developer-tools/javascript-sdk/api-reference#initialize-reinitialize-growsurf)to re-initialize GrowSurf to make the embeddable elements render.
