module.exports = function(eleventyConfig) {
  // Copy static assets
  eleventyConfig.addPassthroughCopy("images/screenshots");
  eleventyConfig.addPassthroughCopy("images/social-preview");
  eleventyConfig.addPassthroughCopy("images/logos");
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

  eleventyConfig.addFilter("isExternalLink", (url) => {
    return url && (url.startsWith("http") || url.startsWith("//"));
  });

  eleventyConfig.addNunjucksAsyncShortcode("image", async function(src, alt, style, sizes = "100vw", loading = "lazy", decoding = "async", fetchpriority = "auto") {
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
      urlPath: "/images/optimized/"
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



  // Load project data from JSON files
  eleventyConfig.addGlobalData("projects", () => {
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(__dirname, 'data');

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
