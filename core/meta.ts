export function SetMetadata(
    title: string,
    description: string,
    url: string = "https://weexnes.dev",
    image: string = "https://weexnes.dev/wicon.png" // Default favicon as the image
) {
    useHead({
        title: title + " | WeeXnes",
        meta: [
            {
                name: 'description',
                content: description
            },
            {
                name: "theme-color",
                content: "#e73c7e"
            },
            // Open Graph meta tags
            {
                property: 'og:title',
                content: title + " | WeeXnes",
            },
            {
                property: 'og:description',
                content: description,
            },
            {
                property: 'og:site_name',
                content: 'WeeXnes',
            },
            {
                property: 'og:url',
                content: url,
            },
            {
                property: 'og:image',
                content: image, // Link to favicon or any image
            },
            {
                property: 'og:type',
                content: 'website', // Can be 'website', 'article', 'video', etc.
            },
            {
                property: 'og:image:alt',
                content: 'WeeXnes preview image', // Alt text for the image
            },

            // Twitter Card meta tags
            {
                name: 'twitter:card',
                content: 'summary_large_image', // This defines the type of Twitter Card (e.g., summary_large_image for rich media)
            },
            {
                name: 'twitter:title',
                content: title + " | WeeXnes",
            },
            {
                name: 'twitter:description',
                content: description,
            },
            {
                name: 'twitter:image',
                content: image, // Using favicon here as well
            },
            {
                name: 'twitter:site',
                content: '@toxisches', // Updated with your Twitter handle
            },
            {
                name: 'twitter:creator',
                content: '@toxisches', // Author or creator Twitter handle, updated with your handle
            }
        ]
    });
}
