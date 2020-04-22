# private-contact-discovery-demo
 Basic private set intersection protocol powering a simple demonstration of private contact discovery

## Browser Demo
Try out the demo here: [`browser.html`](https://htmlpreview.github.io/?https://github.com/wyatt-howe/private-contact-discovery-demo/blob/master/browser.html).

Open the console, and type the following line to sign up a new user Alice.  You may use a phone number instead, etc. like so:
```javascript
register('Alice')
register('Bob')
...
```
Once the dummy service has a few users, call the discover command with a contact list of potentially registerd users.
```javascript
discover(['Alice', .....]).then(console.log)
```
Private contact discovery will return the ones who in fact are registered.
