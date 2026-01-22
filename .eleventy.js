module.exports = function(eleventyConfig) {
  // Copy static assets
  eleventyConfig.addPassthroughCopy("styles.css");
  eleventyConfig.addPassthroughCopy("images/screenshots");
  eleventyConfig.addPassthroughCopy("images/social-preview");
  eleventyConfig.addPassthroughCopy("images/logos");
  eleventyConfig.addPassthroughCopy("src/robots.txt");
  // IndexNow Key
  eleventyConfig.addPassthroughCopy({ "src/key": "/" });

  eleventyConfig.addGlobalData("buildDate", () => {
    return new Date().toISOString().split('T')[0];
  });

  eleventyConfig.addFilter("stripHtml", (content) => {
    return content ? content.replace(/(<([^>]+)>)/gi, "") : "";
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
