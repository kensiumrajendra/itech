function isObject(obj) {
    return obj !== null &&
        typeof obj === 'object' &&
        !Array.isArray(obj);
}

function normalizeResponse(input) {
    if (!input) return null;

    const output = Object.keys(input).reduce((result, key) => {
        /* eslint-disable no-param-reassign */
        if (input[key]?.edges) {
            result[key] = input[key].edges.map(edge => normalizeResponse(edge.node));
        } else if (isObject(input[key])) {
            result[key] = normalizeResponse(input[key]);
        } else if (key !== '__typename') {
            result[key] = input[key];
        }

        return result;
    }, {});

    return output;
}

export default async function gqlFetch(query) {
    const body = JSON.stringify({ query });
    const headers = new Headers();
    const apiToken = window.jsContext.settings.storefront_api.token;

    headers.append('Content-Type', 'application/json');
    headers.append('Authorization', `Bearer ${apiToken}`);

    const requestOptions = {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body,
    };

    const response = await fetch('/graphql', requestOptions);
    const serialized = await response.json();

    return normalizeResponse(serialized);
}
