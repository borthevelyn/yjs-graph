## Installation
craco requires react scripts \
react scripts only supports typescript 4 \
npm install with --legacy-peer-deps, then \
to circumvent: delete package-lock files, change node_modules/react-scripts/package.json, add ^5 version to typescript \
repeat for other packages (jest-watch-typeahead) \
npm install should not produce errors, also required to restore lock files \
better: use patch-package to automate this process
