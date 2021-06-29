library(biomaRt);
args <- commandArgs(trailingOnly = TRUE);
mart <- args[1]; #mart = 'ENSEMBL_MART_ENSEMBL';
dataset <- args[2]; #dataset = 'hsapiens_gene_ensembl'; | mmusculus_gene_ensembl mmusculus_gene_ensembl
host <- args[3]; #host = 'www.ensembl.org';
outputfile <- args[4];
theUsedMart = useMart(mart, dataset=dataset, host=host);
biomaRTable <- getBM(mart = theUsedMart,attributes = c("ensembl_gene_id","go_id", "go_linkage_type", "entrezgene", "namespace_1003", "name_1006","kegg_enzyme","transcript_length"));
write.table(biomaRTable, file=outputfile, quote=FALSE, sep="\t", row.names = FALSE);
