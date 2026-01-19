module.exports = function(eleventyConfig) {
  // Copy static assets
  eleventyConfig.addPassthroughCopy("styles.css");
  eleventyConfig.addPassthroughCopy("screenshots");
  eleventyConfig.addPassthroughCopy("logos");

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
        projects.push(JSON.parse(content));
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

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes"
    },
    htmlTemplateEngine: "njk"
  };
};
