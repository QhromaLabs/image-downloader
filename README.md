<h1 align="center">
  <img src="images/logo.svg" alt="Image Downloader logo" height="40" valign="middle" />
  &nbsp;Qhroma Image Scraper
</h1>

<h2 align="center">
  Browse and download images on the web
  <br />
  <br />
</h2>

Welcome! If you're here to learn more about how to use this extension check out the [User Guide](USERGUIDE)

If you're a developer interested in running the extension locally instead of installing it from the Chrome Web Store - keep reading!

## Local development
1. First, install the dependencies:
    ```bash
    bun install
    ```
2. Build the extension **before loading it**:
    ```bash
    bun run build
    ```
    This step generates the icons (`images/icon_*.png`) and writes the compiled extension to the `build` directory. If you want to automatically rebuild while developing, run:
    ```bash
    bun start
    ```
3. Open the extension list in your browser settings: [chrome://extensions](chrome://extensions)
4. Enable **Developer mode**
5. Click the **Load unpacked** button and select the `build` directory
6. Enjoy!

## Test
Run and watch tests related to locally changed files - useful during development:
```bash
bun test
```

Or run all the tests without watching and generate a coverage report:
```bash
bun run test.all
```

## License
See [LICENSE.md](LICENSE.md)
