const csv = require("csv-parser");
const { Readable } = require("stream");

function isBooleanString(value) {
    return value === "true" || value === "false";
}

function validateProductRow(row, lineNumber) {
    const errors = [];
    if (!row.name || row.name.trim() === "") {
        errors.push(`Missing 'name' at line ${lineNumber}`);
    }
    if (!row.price || isNaN(parseFloat(row.price))) {
        errors.push(`Invalid or missing 'price' at line ${lineNumber}`);
    }
    if (row.qty && isNaN(parseInt(row.qty))) {
        errors.push(`Invalid 'qty' at line ${lineNumber}`);
    }
    if (row.out_of_stock && !isBooleanString(row.out_of_stock)) {
        errors.push(`Invalid 'out_of_stock' value at line ${lineNumber} (must be 'true' or 'false')`);
    }
    return errors;
}

exports.parseCSV = (csvText) => {
    return new Promise((resolve, reject) => {
        const results = [];
        const errors = [];
        let lineNumber = 1;

        const stream = Readable.from(csvText);
        stream
            .pipe(csv())
            .on("data", (row) => {
                const validationErrors = validateProductRow(row, lineNumber);
                if (validationErrors.length > 0) {
                    errors.push(...validationErrors);
                } else {
                    results.push({
                        name: row.name.trim(),
                        image: row.image ? row.image.trim() : null,
                        price: parseFloat(row.price),
                        qty: row.qty ? parseInt(row.qty) : 0,
                        out_of_stock: row.out_of_stock === "true",
                    });
                }
                lineNumber++;
            })
            .on("end", () => resolve({ valid: results, errors }))
            .on("error", (err) =>
                reject(new Error(`CSV parsing error: ${err.message}`))
            );
    });
};
