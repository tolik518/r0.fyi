module.exports = function(eleventyConfig) {
  // Copy static assets
  eleventyConfig.addPassthroughCopy("images/screenshots");
  eleventyConfig.addPassthroughCopy("images/social-preview");
  eleventyConfig.addPassthroughCopy("images/logos");
  eleventyConfig.addPassthroughCopy("images/blog");
  eleventyConfig.addPassthroughCopy("src/robots.txt");
  // IndexNow Key
  eleventyConfig.addPassthroughCopy({ "src/key": "/" });
  // Favicon files to root
  eleventyConfig.addPassthroughCopy({ "images/favicon": "/" });

  eleventyConfig.addGlobalData("buildDate", () => {
    return new Date().toISOString().split('T')[0];
  });

  eleventyConfig.addFilter("stripHtml", (content) => {
    return content ? content.replace(/(<([^>]+)>)/gi, "") : "";
  });

  eleventyConfig.addFilter("truncateHtml", (content, limit) => {
    if (!content) return '';
    // Drop script/style blocks entirely so they don't count toward the preview
    content = content.replace(/<script[\s\S]*?<\/script>/gi, '')
                     .replace(/<style[\s\S]*?<\/style>/gi, '');
    // If visible text already fits, return as-is
    if (content.replace(/(<([^>]+)>)/gi, '').length <= limit) return content;

    const voidElements = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i;
    const parts = content.split(/(<[^>]*>)/);
    const tagStack = [];
    let charCount = 0;
    let result = '';
    let done = false;

    for (const part of parts) {
      if (done) break;
      if (part.startsWith('<')) {
        if (/^<\//.test(part)) {
          tagStack.pop();
        } else {
          const name = (part.match(/^<(\w+)/) || [])[1] || '';
          if (name && !voidElements.test(name) && !/\/>$/.test(part)) {
            tagStack.push(name);
          }
        }
        result += part;
      } else {
        const remaining = limit - charCount;
        if (part.length <= remaining) {
          result += part;
          charCount += part.length;
        } else {
          const cut = part.slice(0, remaining).replace(/\s+\S*$/, '') || part.slice(0, remaining);
          result += cut + '…';
          done = true;
        }
      }
    }

    // Close any tags left open at the cut point
    for (let i = tagStack.length - 1; i >= 0; i--) {
      result += `</${tagStack[i]}>`;
    }
    return result;
  });

  eleventyConfig.addFilter("isExternalLink", (url) => {
    return url && (url.startsWith("http") || url.startsWith("//"));
  });

  eleventyConfig.addNunjucksAsyncShortcode("image", async function(src, alt, style, sizes = "100vw", loading = "lazy", decoding = "async", fetchpriority = "auto") {
    const path = require("path");
    if(alt === undefined) {
      // alt text is required (alt="" is ok though)
      throw new Error(`Missing \`alt\` on myImage from: ${src}`);
    }

    // If it is an external URL, do not optimize it (dynamic images)
    if (src.startsWith("http")) {
      return `<img src="${src}" alt="${alt}" style="${style}" sizes="${sizes}" loading="${loading}" decoding="${decoding}" fetchpriority="${fetchpriority}">`;
    }

    // prepend / if it's a relative path starting with images/ to make it project-root relative
    // Actually, if src is "images/...", and we run eleventy from root, it works.
    // Use path.join to be safe?
    // If it starts with / or http, handle appropriately.
    let inputPath = src;
    if (!src.startsWith("http") && !src.startsWith("/")) {
      inputPath = "./" + src;
    } else if (src.startsWith("/")) {
      inputPath = "." + src;
    }

    let isLogo = src.includes("logos/");
    let widths = isLogo ? [null] : [400, 800, 1200];
    let formats = isLogo ? ["auto"] : ["avif", "webp", "auto"];

    let metadata = await require("@11ty/eleventy-img")(inputPath, {
      widths,
      formats,
      outputDir: "./_site/images/optimized/",
      urlPath: "/images/optimized/",
      filenameFormat: function (id, src, width, format, options) {
        const extension = path.extname(src);
        const name = path.basename(src, extension);
        return `${name}-${width}.${format}`;
      }
    });

    let imageAttributes = {
      alt,
      sizes,
      style,
      loading,
      decoding,
      fetchpriority
    };

    // You bet we throw an error on missing alt (alt="" works okay)
    return require("@11ty/eleventy-img").generateHTML(metadata, imageAttributes);
  });

  eleventyConfig.addShortcode("inlineCss", () => {
    const fs = require("fs");
    const cssPath = "./styles.css";
    if (fs.existsSync(cssPath)) {
      const css = fs.readFileSync(cssPath, "utf8");
      const CleanCSS = require("clean-css");
      return new CleanCSS({}).minify(css).styles;
    }
    return "";
  });



  eleventyConfig.addFilter("readableDate", (date) => {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  });

  eleventyConfig.addFilter("isoDate", (date) => {
    return new Date(date).toISOString();
  });

  eleventyConfig.addFilter("rfc822Date", (date) => {
    return new Date(date).toUTCString();
  });

  eleventyConfig.addFilter("dateString", (date) => {
    return new Date(date).toISOString().slice(0, 10);
  });

  const markdownItAnchor = require("markdown-it-anchor");
  eleventyConfig.amendLibrary("md", mdLib => {
    mdLib.use(markdownItAnchor, {
      permalink: markdownItAnchor.permalink.headerLink()
    });
  });

  eleventyConfig.ignores.add("src/projects/*.json");

  // Load project data from JSON files
  eleventyConfig.addGlobalData("projects", () => {
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(__dirname, 'src', 'projects');

    const projects = [];
    const files = fs.readdirSync(dataDir);

    files.forEach(file => {
      if (file.endsWith('.json')) {
        const content = fs.readFileSync(path.join(dataDir, file), 'utf8');
        const project = JSON.parse(content);

        // Auto-detect logo
        const logoPath = `images/logos/${project.id}.png`;
        if (fs.existsSync(path.join(__dirname, logoPath))) {
          project.logo = logoPath;
        }

        // Auto-detect social preview
        const socialPreviewPath = `images/social-preview/${project.id}.png`;
        if (fs.existsSync(path.join(__dirname, socialPreviewPath))) {
          project.social_preview = socialPreviewPath;
        }

        projects.push(project);
      }
    });

    // Sort by year_modified (desc) then year_started (desc), so the currently active projects appear first
    return projects.sort((a, b) => {
      // Use year_started as fallback for year_modified if it's missing (though it should be there)
      const aEnd = a.year_modified || a.year_started;
      const bEnd = b.year_modified || b.year_started;

      if (bEnd !== aEnd) {
        return bEnd - aEnd;
      }
      return b.year_started - a.year_started;
    });
  });

  // Minify CSS after build
  eleventyConfig.on('eleventy.after', async () => {
    const CleanCSS = require('clean-css');
    const fs = require('fs');
    const path = require('path');

    const outputDir = "_site";
    const cssFile = path.join(__dirname, outputDir, "styles.css");

    if (fs.existsSync(cssFile)) {
      console.log("Minifying styles.css...");
      const input = fs.readFileSync(cssFile, "utf8");
      const output = new CleanCSS({}).minify(input).styles;
      fs.writeFileSync(cssFile, output);
    }
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes"
    },
    htmlTemplateEngine: "njk"
  };
};
