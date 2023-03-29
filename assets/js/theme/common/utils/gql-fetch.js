export default async function gqlFetch(token, query) {
    const body = JSON.stringify({ query });
    const headers = new Headers();

    headers.append('Content-Type', 'application/json');
    headers.append('Authorization', `Bearer ${token}`);

    const requestOptions = {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body,
    };

    const response = await fetch('/graphql', requestOptions);
    const serialized = await response.json();

    return serialized;
}
